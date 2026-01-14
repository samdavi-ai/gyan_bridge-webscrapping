import json
import os
import time
from datetime import datetime

class AnalyticsEngine:
    """
    Tracks 'Real' metrics: Internal View Counts (Community Views).
    Stores data in a local JSON file.
    """
    def __init__(self, db_path='data/analytics.json'):
        self.db_path = db_path
        self.data = self._load_db()

    def _load_db(self):
        if not os.path.exists(os.path.dirname(self.db_path)):
            os.makedirs(os.path.dirname(self.db_path))
            
        default_db = {'views': {}, 'searches': [], 'time_series': []}
        
        if os.path.exists(self.db_path):
            try:
                with open(self.db_path, 'r') as f:
                    data = json.load(f)
                    # Ensure new schema exists
                    if 'time_series' not in data:
                        data['time_series'] = []
                    return data
            except:
                return default_db
        return default_db

    def _save_db(self):
        try:
            with open(self.db_path, 'w') as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            print(f"⚠️ Analytics Save Error: {e}")

    def track_view(self, url, topic=None):
        """Called when a user clicks 'Read'"""
        # 1. Update Legacy Counter (for fast lookup)
        if url in self.data['views']:
            self.data['views'][url] += 1
        else:
            self.data['views'][url] = 1
            
        # 2. Store Time-Series Event
        event = {
            'type': 'view',
            'url': url,
            'topic': topic or 'General',
            'timestamp': time.time(),
            'date': datetime.now().strftime('%Y-%m-%d')
        }
        self.data['time_series'].append(event)
            
        self._save_db()
        return self.data['views'][url]

    def get_time_series_data(self):
        """Returns raw time series for prediction"""
        return self.data.get('time_series', [])

    def get_weekly_stats(self):
        """Aggregate stats + Return raw data for Predictor"""
        return {
            'total_global_views': sum(self.data['views'].values()),
            'unique_articles_read': len(self.data['views']),
            'recent_searches': self.data.get('searches', [])[-20:],
            'raw_series': self.data.get('time_series', []) # Pass to predictor
        }
