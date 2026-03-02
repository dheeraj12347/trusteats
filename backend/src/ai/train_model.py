import pandas as pd
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

def train():
    # Load the cleaned data
    df = pd.read_csv('cleaned_reviews.csv').dropna()
    
    # Initialize TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(max_features=5000)
    X = vectorizer.fit_transform(df['cleaned_text'])
    y = df['label']
    
    # Train Model
    model = LogisticRegression()
    model.fit(X, y)
    
    # Save the vectorizer and the model
    with open('vectorizer.pkl', 'wb') as f:
        pickle.dump(vectorizer, f)
    with open('model.pkl', 'wb') as f:
        pickle.dump(model, f)
        
    print("Model and Vectorizer saved successfully!")

if __name__ == "__main__":
    train()