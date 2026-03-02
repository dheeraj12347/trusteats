import pandas as pd
import re
import string
from sklearn.model_selection import train_test_split

def clean_text(text):
    # Convert to lowercase
    text = str(text).lower()
    # Remove HTML tags (common in Amazon reviews)
    text = re.sub(r'<.*?>', '', text)
    # Remove punctuation
    text = text.translate(str.maketrans('', '', string.punctuation))
    # Remove numbers
    text = re.sub(r'\d+', '', text)
    return text.strip()

def prepare_data(file_path):
    # Load the dataset
    df = pd.read_csv(file_path)
    
    # Selecting columns: 'Text' (Review) and 'Score' (Rating)
    # We'll assume Score 4-5 is 'Trustworthy' (1) and 1-2 is 'Untrustworthy' (0)
    df = df[['Text', 'Score']].dropna()
    df['label'] = df['Score'].apply(lambda x: 1 if x >= 4 else 0)
    
    # Apply cleaning
    print("Cleaning reviews...")
    df['cleaned_text'] = df['Text'].apply(clean_text)
    
    # Save cleaned data for training
    df[['cleaned_text', 'label']].to_csv('cleaned_reviews.csv', index=False)
    print("Preprocessed data saved to cleaned_reviews.csv")

if __name__ == "__main__":
    prepare_data('Reviews.csv')