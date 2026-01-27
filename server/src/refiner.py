import os
import sys
from langchain_openai import ChatOpenAI

# Fix Unicode encoding for Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass  # Fallback if reconfigure fails

class QueryRefiner:
    """
    Refines user queries to ensure they target:
    1. Christian Context (Faith-based resources)
    2. Specific Sub-topics (Music -> Gospel Music, Worship Training)
    Uses OpenAI GPT models for refinement.
    """

    def __init__(self):
        try:
            self.llm = ChatOpenAI(
                model="gpt-3.5-turbo", 
                temperature=0.3
            )
            print("🧠 QueryRefiner: OpenAI GPT Connected.")
        except Exception as e:
            self.llm = None
            print(f"⚠️ QueryRefiner: OpenAI Error: {e}")

    def refine(self, topic):
        """
        Input: 'music schools'
        Output: 'music schools' (Direct Pass-through)
        """
        # [GLOBAL BYPASS] User explicitly requested NO AI refinement.
        # Returning raw topic immediately.
        # print(f"✨ AI Refinement Disabled: Using raw '{topic}'")
        return topic.strip()
