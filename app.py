import numpy as np
import yfinance as yf
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

HISTORY_PERIOD = "5y"
TRAIN_FRACTION = 0.8
PREDICTORS = ["Open", "High", "Low", "Volume"]
TARGET = "Close"

ASSETS = {
    "AAPL": {"name": "Apple Inc.", "color": "#000000"},
    "TSLA": {"name": "Tesla Inc.", "color": "#E82127"},
    "META": {"name": "Meta Platforms Inc.", "color": "#0A66C2"},
}


def train_model(symbol):
    """Train a linear regression model for the given symbol."""
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=HISTORY_PERIOD)
        df = df.drop(columns=["Dividends", "Stock Splits"], errors="ignore")

        df["Target"] = df[TARGET].shift(-1)
        df = df.dropna(subset=["Target"])

        if len(df) < 10:
            return None, None, None

        train_size = int(TRAIN_FRACTION * len(df))
        train = df.iloc[:train_size]
        test = df.iloc[train_size:]

        X_train, y_train = train[PREDICTORS], train["Target"]
        X_test, y_test = test[PREDICTORS], test["Target"]

        model = Pipeline(
            [
                ("scaler", StandardScaler()),
                ("regressor", LinearRegression()),
            ]
        )
        model.fit(X_train, y_train)

        return model, df, (X_test, y_test)
    except Exception as e:
        print(f"Error training model for {symbol}: {e}")
        return None, None, None


@app.route("/api/assets", methods=["GET", "POST"])
def manage_assets():
    """Return or add to the list of available assets."""
    if request.method == "POST":
        data = request.get_json() or {}
        symbol = data.get("symbol", "").strip().upper()
        
        if not symbol:
            return jsonify({"error": "Symbol is required"}), 400
            
        if symbol in ASSETS:
            return jsonify({"error": f"Asset {symbol} is already on the dashboard"}), 400
            
        try:
            ticker = yf.Ticker(symbol)
            # Verify if the symbol is valid by downloading history
            df = ticker.history(period="1d")
            if df.empty:
                return jsonify({"error": f"Could not retrieve data for symbol '{symbol}'. Please verify the symbol."}), 400
                
            # Retrieve name if possible
            try:
                info = ticker.info
                name = info.get("longName") or info.get("shortName") or symbol
            except Exception:
                name = symbol
                
            # Predefined list of vibrant dark-theme friendly colors
            SUGGESTED_COLORS = [
                "#3b82f6",  # Blue
                "#10b981",  # Emerald
                "#f59e0b",  # Amber
                "#ec4899",  # Pink
                "#8b5cf6",  # Violet
                "#06b6d4",  # Cyan
                "#f97316",  # Orange
                "#14b8a6",  # Teal
            ]
            
            # Deterministic color assignment based on symbol name
            color_idx = sum(ord(c) for c in symbol) % len(SUGGESTED_COLORS)
            color = SUGGESTED_COLORS[color_idx]
            
            # Save new asset
            ASSETS[symbol] = {"name": name, "color": color}
            
            return jsonify({
                "symbol": symbol,
                "name": name,
                "color": color,
                "message": f"Successfully added {name} ({symbol}) to dashboard"
            }), 201
            
        except Exception as e:
            return jsonify({"error": f"Failed to validate ticker symbol: {str(e)}"}), 500
            
    # GET method
    return jsonify(
        [
            {
                "symbol": symbol,
                "name": info["name"],
                "color": info["color"],
            }
            for symbol, info in ASSETS.items()
        ]
    )


@app.route("/api/assets/<symbol>/history", methods=["GET"])
def get_history(symbol):
    """Return historical data for the given symbol."""
    symbol = symbol.upper()
    if symbol not in ASSETS:
        return jsonify({"error": "Asset not found"}), 404

    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=HISTORY_PERIOD)
        df = df.drop(columns=["Dividends", "Stock Splits"], errors="ignore")

        # Convert to list of dicts for JSON serialization
        df_reset = df.reset_index()
        df_reset["Date"] = df_reset["Date"].dt.strftime("%Y-%m-%d")

        return jsonify(
            {
                "symbol": symbol,
                "name": ASSETS[symbol]["name"],
                "data": df_reset.to_dict("records"),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/<symbol>/prediction", methods=["GET"])
def get_prediction(symbol):
    """Return next-day close price prediction for the given symbol."""
    symbol = symbol.upper()
    if symbol not in ASSETS:
        return jsonify({"error": "Asset not found"}), 404

    try:
        model, df, (X_test, y_test) = train_model(symbol)
        if model is None:
            return jsonify({"error": "Could not train model"}), 500

        y_pred = model.predict(X_test)

        # Get the latest data to make a new prediction
        latest_data = df[PREDICTORS].iloc[-1:].values
        next_prediction = model.predict(latest_data)[0]

        # Get metrics
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        # Naive baseline
        naive_pred = df[TARGET].iloc[len(df) - len(y_test) :].values
        naive_mae = mean_absolute_error(y_test, naive_pred)

        # Get current price
        ticker = yf.Ticker(symbol)
        current_price = ticker.info.get("currentPrice", df[TARGET].iloc[-1])

        return jsonify(
            {
                "symbol": symbol,
                "name": ASSETS[symbol]["name"],
                "current_price": float(current_price),
                "predicted_next_close": float(next_prediction),
                "metrics": {
                    "r2": float(r2),
                    "mae": float(mae),
                    "rmse": float(rmse),
                    "naive_mae": float(naive_mae),
                },
                "model_trained_on_rows": len(df),
                "test_rows": len(y_test),
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
