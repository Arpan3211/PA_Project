import os
import json

# Create empty JSON files for data storage
def init_db():
    # Get the current directory (where init_db.py is located)
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Define file paths
    users_file = os.path.join(current_dir, 'users.json')
    conversations_file = os.path.join(current_dir, 'conversations.json')
    messages_file = os.path.join(current_dir, 'messages.json')

    # Create empty JSON files if they don't exist
    if not os.path.exists(users_file):
        with open(users_file, 'w') as f:
            json.dump({'users': {}, 'next_id': 1}, f)

    if not os.path.exists(conversations_file):
        with open(conversations_file, 'w') as f:
            json.dump({'conversations': {}, 'next_id': 1}, f)

    if not os.path.exists(messages_file):
        with open(messages_file, 'w') as f:
            json.dump({'messages': {}, 'next_id': 1}, f)

    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db()
