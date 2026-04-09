import yfinance as yf
import pandas as pd

ticker = yf.Ticker("AAPL")

df = ticker.history(period="5y")

df = df.drop(columns=["Dividends", "Stock Splits"])

print(df.head())



