import numpy as np
import yfinance as yf
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

SYMBOL = "AAPL"
HISTORY_PERIOD = "5y"
TRAIN_FRACTION = 0.8

predictors = ["Open", "High", "Low", "Volume"]
target = "Close"

ticker = yf.Ticker(SYMBOL)
df = ticker.history(period=HISTORY_PERIOD)
df = df.drop(columns=["Dividends", "Stock Splits"])

# Use today's OHLCV to predict the next trading day's close (real forecasting).
# Same-day Open/High/Low → Close would leak information and inflate scores.
df["Target"] = df[target].shift(-1)
df = df.dropna(subset=["Target"])

train_size = int(TRAIN_FRACTION * len(df))
train = df.iloc[:train_size]
test = df.iloc[train_size:]

X_train, y_train = train[predictors], train["Target"]
X_test, y_test = test[predictors], test["Target"]

model = Pipeline(
    [
        ("scaler", StandardScaler()),
        ("regressor", LinearRegression()),
    ]
)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)

r2 = r2_score(y_test, y_pred)
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

# Naive baseline: tomorrow's close ≈ today's close
naive_pred = test[target].values
naive_mae = mean_absolute_error(y_test, naive_pred)

print(f"{SYMBOL} next-day close prediction (Linear Regression)")
print(f"History: {HISTORY_PERIOD} | Train: {len(train)} rows | Test: {len(test)} rows")
print()
print("Test metrics:")
print(f"  R²:   {r2:.4f}")
print(f"  MAE:  ${mae:.2f}")
print(f"  RMSE: ${rmse:.2f}")
print()
print(f"Naive baseline MAE (predict today's close): ${naive_mae:.2f}")
print()
print("Last 5 test days (actual vs predicted next-day close):")
comparison = pd.DataFrame(
    {"Actual": y_test.values, "Predicted": y_pred},
    index=y_test.index,
)
print(comparison.tail().to_string())
