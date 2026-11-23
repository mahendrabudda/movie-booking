"""
Reproducible Synthetic Dataset Generator for Movie AI Dynamic Pricing.
NOTE: This dataset is synthetically generated using a fixed random seed (42)
for portfolio demonstration. The accuracy metrics produced on this dataset do NOT
represent real-world box-office accuracy. The pipeline is structured so real
historical reviewer and box-office data can drop-in replace this CSV.
"""

import os
import numpy as np
import pandas as pd

SEED = 42
CLASSES = [
    "FLOP",
    "BELOW_AVERAGE",
    "AVERAGE",
    "HIT",
    "SUPERHIT",
    "BLOCKBUSTER",
    "INDUSTRY_HIT",
]
GENRES = ["ACTION", "DRAMA", "SCI_FI", "COMEDY", "THRILLER", "ROMANCE", "HORROR"]
LANGUAGES = ["Telugu", "Hindi", "English", "Tamil", "Kannada", "Malayalam"]


def assign_label(mean_r: float, count_gte_8: int, std_r: float, genre: str, rng: np.random.Generator) -> str:
    # Add small realistic noise so classifier learns probabilistic boundaries
    score = mean_r + 0.12 * count_gte_8 - 0.15 * std_r + rng.normal(0, 0.22)
    if genre in ("ACTION", "SCI_FI"):
        score += 0.15
    if score < 4.2:
        return "FLOP"
    elif score < 5.5:
        return "BELOW_AVERAGE"
    elif score < 6.8:
        return "AVERAGE"
    elif score < 7.9:
        return "HIT"
    elif score < 8.8:
        return "SUPERHIT"
    elif score < 9.55:
        return "BLOCKBUSTER"
    else:
        return "INDUSTRY_HIT"


def generate_synthetic_dataset(n_samples: int = 2500, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []

    for _ in range(n_samples):
        center = rng.uniform(2.0, 9.8)
        spread = rng.uniform(0.3, 1.8)
        raw_ratings = np.clip(np.round(rng.normal(center, spread, size=10)), 1, 10).astype(int)

        mean_r = float(np.round(np.mean(raw_ratings), 2))
        median_r = float(np.round(np.median(raw_ratings), 2))
        std_r = float(np.round(np.std(raw_ratings), 2))
        min_r = int(np.min(raw_ratings))
        max_r = int(np.max(raw_ratings))
        count_gte_8 = int(np.sum(raw_ratings >= 8))

        genre = str(rng.choice(GENRES))
        language = str(rng.choice(LANGUAGES))
        days_since_release = int(rng.integers(0, 21))

        label = assign_label(mean_r, count_gte_8, std_r, genre, rng)

        rows.append({
            "mean_rating": mean_r,
            "median_rating": median_r,
            "std_dev_rating": std_r,
            "min_rating": min_r,
            "max_rating": max_r,
            "count_ratings_gte_8": count_gte_8,
            "genre": genre,
            "language": language,
            "days_since_release": days_since_release,
            "target_class": label,
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(out_dir, "synthetic_movie_ratings.csv")
    df = generate_synthetic_dataset(n_samples=2500, seed=SEED)
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} synthetic records at {csv_path}")
    print("Class distribution:\n", df["target_class"].value_counts())
