import yfinance as yf
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt

ticker = yf.Ticker("AAPL")

df = ticker.history(period="5y")

df = df.drop(columns=["Dividends", "Stock Splits"])

print(df.head())

# Prepare data for regression plot
df_plot = df.reset_index()
df_plot["Days"] = (df_plot["Date"] - df_plot["Date"].min()).dt.days

# Create regression plot
sns.set_style("whitegrid")
p = sns.lmplot(x="Days", y="Close", data=df_plot, fit_reg=True, ci=None)
p.set_axis_labels("Days Since Start", "Stock Price ($)")
plt.title("AAPL Stock Price Trend")
plt.tight_layout()
plt.show()

