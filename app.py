import numpy as np
import yfinance as yf
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from flask import Flask, jsonify
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


@app.route("/api/assets", methods=["GET"])
def get_assets():
    """Return list of available assets."""
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
