"""
FinSure Multi-Class Scam Type Classifier
Predicts scam typology across 6 canonical classes:
0: account_takeover
1: collect_request_scam
2: mule_account
3: phishing_or_social_engineering
4: card_testing
5: other
"""

from typing import List, Tuple, Optional, Dict, Any
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from ml.data.deep_datasets import SCAM_CLASSES, SCAM_TYPE_MAP


class ScamTypeClassifier(nn.Module):
    """
    Neural classification head predicting scam category.
    Uses class-weighted cross-entropy to handle extreme category imbalance.
    """
    def __init__(
        self,
        input_dim: int = 36,
        hidden_dim: int = 64,
        num_classes: int = 6,
        dropout: float = 0.2
    ):
        super().__init__()
        self.input_dim = input_dim
        self.num_classes = num_classes
        self.classes = SCAM_CLASSES

        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.LeakyReLU(0.1),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.LeakyReLU(0.1),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim // 2, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Returns raw class logits: (batch_size, 6)"""
        return self.net(x)

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        """Returns softmax probabilities: (N, 6)"""
        self.eval()
        with torch.no_grad():
            x_t = torch.tensor(x, dtype=torch.float32)
            logits = self.forward(x_t)
            probs = F.softmax(logits, dim=-1).cpu().numpy()
        return probs

    def predict_label(self, x: np.ndarray) -> List[str]:
        """Returns predicted class label string for each sample."""
        probs = self.predict_proba(x)
        class_indices = np.argmax(probs, axis=-1)
        return [self.classes[idx] for idx in class_indices]
