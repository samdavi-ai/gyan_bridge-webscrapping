import statistics
from datetime import datetime, timedelta
import collections
import numpy as np
from sklearn.linear_model import LinearRegression

class Predictor:
    """
    Statistical Prediction Engine using Linear Regression.
    """
    
    def generate_forecast(self, time_series_data, topic_filter=None, horizon_days=7):
        """
        Input: List of dicts {'date': 'YYYY-MM-DD', 'count': N}
        Params:
            topic_filter: str (optional) - "church", "india", etc.
            horizon_days: int - Prediction range (7 to 365)
        Output: Historical + Forecast Data
        """
        # 1. Prepare Data - Use YEAR numbers directly instead of ordinals
        years = []
        counts = []
        
        # Sort by date first
        sorted_data = sorted(time_series_data, key=lambda x: x['date'])
        
        for item in sorted_data:
            try:
                # Extract year from date string (YYYY or YYYY-MM or YYYY-MM-DD)
                d_str = item['date']
                year = int(d_str[:4])  # Just take first 4 chars as year
                
                years.append(year)
                counts.append(item['count'])
            except:
                continue

        if len(years) < 2:
            return {
                'historical': time_series_data,
                'forecast': [],
                'stats': {'trend_factor': 1.0, 'volatility': 0, 'r_squared': 0, 'topic': topic_filter}
            }

        # Group by year and take MAX count per year (to handle duplicates)
        year_counts = {}
        for y, c in zip(years, counts):
            if y not in year_counts:
                year_counts[y] = c
            else:
                year_counts[y] = max(year_counts[y], c)  # Take highest count
        
        # Convert back to sorted lists
        years = sorted(year_counts.keys())
        counts = [year_counts[y] for y in years]

        X = np.array(years).reshape(-1, 1)
        y = np.array(counts)

        # 2. Train Model
        model = LinearRegression()
        try:
            model.fit(X, y)
            r_sq = model.score(X, y)
            slope = model.coef_[0]
            intercept = model.intercept_
            
            # Calculate Standard Error
            preds = model.predict(X)
            residuals = y - preds
            std_error = np.std(residuals)
        except Exception as e:
            print(f"⚠️ Predictor Fit Error: {e}")
            slope = 0
            intercept = np.mean(y) if len(y) > 0 else 0
            std_error = 0
            r_sq = 0

        # 3. Generate Forecast - YEARLY instead of daily
        current_year = datetime.now().year
        last_data_year = max(years)
        
        # Start forecast from next year after last data
        forecast_start_year = max(current_year, last_data_year) + 1
        
        # Convert horizon_days to years (rough approximation)
        forecast_years_count = max(1, horizon_days // 365)
        
        forecast = []
        for i in range(forecast_years_count):
            future_year = forecast_start_year + i
            
            try:
                prediction = model.predict([[future_year]])[0]
            except:
                prediction = intercept
                
            prediction = max(0, prediction)  # No negative events
            
            # Confidence Interval
            uncertainty = 1.96 * std_error * (1 + (i * 0.1))
            
            upper = prediction + uncertainty
            lower = max(0, prediction - uncertainty)
            
            forecast.append({
                'date': str(future_year),
                'prediction': round(prediction, 0),  # Round to whole numbers
                'upper': round(upper, 0),
                'lower': round(lower, 0)
            })

        # Add current year actual data as anchor if available
        historical_formatted = []
        for year_val, c in zip(years, counts):
            historical_formatted.append({
                'date': str(year_val),
                'count': int(c)
            })

        # Trend Factor
        avg_y = np.mean(y) if len(y) > 0 and np.mean(y) > 0 else 1
        growth_pct = (slope * 1) / avg_y  # Annual growth
        trend_factor = 1.0 + growth_pct
            
        return {
            'historical': historical_formatted,
            'forecast': forecast,
            'stats': {
                'trend_factor': round(trend_factor, 2),
                'volatility': round(std_error, 2),
                'r_squared': round(r_sq, 2),
                'slope': round(slope, 2),
                'topic': topic_filter or 'All'
            }
        }
