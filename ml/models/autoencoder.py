"""
FinSure Deep Autoencoder for Unsupervised Anomaly Detection
Trained strictly on legitimate transactions (is_fraud == 0).
Reconstruction error provides an anomaly score for detecting novel and zero-day fraud patterns.
"""

from typing import Tuple, Optional, Dict, Any
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F


class FinSureAutoencoder(nn.Module):
    """
    Undercomplete Autoencoder compressing 36 tabular features through an 6-dim bottleneck.
    Trained strictly on legitimate transactions.
    """
    def __init__(
        self,
        input_dim: int = 36,
        hidden1: int = 24,
        hidden2: int = 12,
        latent_dim: int = 6,
        dropout: float = 0.05
    ):
        super().__init__()
        self.input_dim = input_dim

        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden1),
            nn.BatchNorm1d(hidden1),
            nn.LeakyReLU(0.1),
            nn.Dropout(dropout),
            nn.Linear(hidden1, hidden2),
            nn.BatchNorm1d(hidden2),
            nn.LeakyReLU(0.1),
            nn.Linear(hidden2, latent_dim)
        )

        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, hidden2),
            nn.BatchNorm1d(hidden2),
            nn.LeakyReLU(0.1),
            nn.Linear(hidden2, hidden1),
            nn.BatchNorm1d(hidden1),
            nn.LeakyReLU(0.1),
            nn.Linear(hidden1, input_dim)
        )

        # Normalization parameters for anomaly score mapping
        self.err_mean: float = 0.0
        self.err_std: float = 1.0
        self.p99_err: float = 1.0

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Returns: reconstructed_x, latent_z"""
        z = self.encoder(x)
        x_rec = self.decoder(z)
        return x_rec, z

    def compute_reconstruction_error(self, x: torch.Tensor) -> torch.Tensor:
        """Computes sample-wise MSE reconstruction error."""
        x_rec, _ = self.forward(x)
        mse_per_sample = torch.mean((x - x_rec) ** 2, dim=-1)
        return mse_per_sample

    def fit_normalizer(self, x_val_legit: np.ndarray):
        """
        Fits score normalization on legitimate validation samples.
        """
        self.eval()
        with torch.no_grad():
            x_t = torch.tensor(x_val_legit, dtype=torch.float32)
            errors = self.compute_reconstruction_error(x_t).cpu().numpy()
            self.err_mean = float(np.mean(errors))
            self.err_std = float(np.std(errors)) if np.std(errors) > 0 else 1.0
            self.p99_err = float(np.percentile(errors, 99)) if len(errors) > 0 else 1.0

    def get_anomaly_score(self, x: np.ndarray) -> np.ndarray:
        """
        Computes normalized anomaly score in [0, 1] using sigmoid scaling:
        score = 1 / (1 + exp(-(err - p99) / std))
        Higher score indicates higher anomaly likelihood.
        """
        self.eval()
        with torch.no_grad():
            x_t = torch.tensor(x, dtype=torch.float32)
            errors = self.compute_reconstruction_error(x_t).cpu().numpy()
            # Sigmoid scaled around p99 threshold
            scaled = (errors - self.p99_err) / max(1e-5, self.err_std)
            # Sigmoid mapping to [0, 1]
            scores = 1.0 / (1.0 + np.exp(-scaled))
        return scores
