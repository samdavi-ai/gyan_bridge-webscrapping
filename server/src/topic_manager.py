import os
import json

TOPICS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'active_topics.json')

# Default topics if file doesn't exist
DEFAULT_TOPICS = {
    "Christianity": True,
    "Science": True,
    "Global News": True,
    "Sports": True,
    "Technology": True
}

class TopicManager:
    def __init__(self):
        self._ensure_data_dir()
        self.load_topics()

    def _ensure_data_dir(self):
        directory = os.path.dirname(TOPICS_FILE)
        if not os.path.exists(directory):
            os.makedirs(directory)

    def load_topics(self):
        """Loads topics from JSON file, or creates default if missing."""
        if os.path.exists(TOPICS_FILE):
            try:
                with open(TOPICS_FILE, 'r') as f:
                    self.topics = json.load(f)
            except Exception as e:
                print(f"⚠️ Error loading topics: {e}. using defaults.")
                self.topics = DEFAULT_TOPICS.copy()
        else:
            self.topics = DEFAULT_TOPICS.copy()
            self.save_topics()
        return self.topics

    def save_topics(self):
        """Saves current topics state to JSON file."""
        try:
            with open(TOPICS_FILE, 'w') as f:
                json.dump(self.topics, f, indent=4)
        except Exception as e:
            print(f"❌ Error saving topics: {e}")

    def get_topics(self):
        return self.topics

    def update_topic(self, topic, status):
        """Updates a specific topic's status (boolean)."""
        if topic in self.topics:
            self.topics[topic] = bool(status)
            self.save_topics()
            return True
        return False

    def get_active_keywords(self):
        """Returns a list of enabled topic names."""
        return [k for k, v in self.topics.items() if v]

    def get_active_topic_query(self):
        """Returns a query string for search (e.g. 'Christianity OR Sports')."""
        active = self.get_active_keywords()
        if not active:
            return None # Implies no topics active
        return " OR ".join([f'"{t}"' for t in active])

# Singleton instance
topic_manager = TopicManager()
