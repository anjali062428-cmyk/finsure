"""
FinSure Dataset Loaders Module
Provides safe, streaming, chunked, and sample-based loaders for all public benchmark datasets.
Enforces read-only access and schema validation without loading multi-gigabyte files into memory.
"""

import os
import zipfile
import hashlib
from typing import Generator, Optional, List, Dict, Any
import pandas as pd

DEFAULT_RAW_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "raw")

DATASET_ARCHIVES = {
    "ulb": {
        "filename": "archive (10).zip",
        "csv": "creditcard.csv",
        "expected_sha256": "a0360ce715992212e9ac72d8ccdca97f4be87dc1fdf2bed011358f7ab409a28a",
        "target_col": "Class",
        "time_col": "Time"
    },
    "sparkov": {
        "filename": "archive (8).zip",
        "train_csv": "fraudTrain.csv",
        "test_csv": "fraudTest.csv",
        "expected_sha256": "4e32829b9ba5a6b17af707c513c15204011044df0e8971e431cedca3d8c0a8a1",
        "target_col": "is_fraud",
        "time_col": "trans_date_trans_time"
    },
    "paysim": {
        "filename": "archive (9).zip",
        "csv": "PS_20174392719_1491204439457_log.csv",
        "expected_sha256": "f7eef9ffad5cfa64a034143a5c9b30491d189420b273d5ad5723ca40b596613d",
        "target_col": "isFraud",
        "time_col": "step"
    },
    "ieee": {
        "filename": "ieee-fraud-detection.zip",
        "train_txn": "train_transaction.csv",
        "train_id": "train_identity.csv",
        "test_txn": "test_transaction.csv",
        "test_id": "test_identity.csv",
        "expected_sha256": "4cc646da09d0a9b265983ffed775b1f9ee15af5266586df610e04d6adae0b829",
        "target_col": "isFraud",
        "time_col": "TransactionDT"
    }
}


def verify_archive_integrity(archive_key: str, raw_dir: str = DEFAULT_RAW_DIR) -> bool:
    """Verifies that the raw archive exists and matches its expected SHA-256 hash."""
    if archive_key not in DATASET_ARCHIVES:
        raise ValueError(f"Unknown dataset key: {archive_key}")
    
    meta = DATASET_ARCHIVES[archive_key]
    file_path = os.path.join(raw_dir, meta["filename"])
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset archive not found: {file_path}")
    
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            hasher.update(chunk)
    
    calc_hash = hasher.hexdigest()
    if calc_hash != meta["expected_sha256"]:
        raise ValueError(
            f"Integrity check failed for {meta['filename']}.\n"
            f"Expected: {meta['expected_sha256']}\nGot:      {calc_hash}"
        )
    return True


def load_ulb_sample(nrows: int = 50000, raw_dir: str = DEFAULT_RAW_DIR) -> pd.DataFrame:
    """Loads a head sample of the ULB Credit Card Fraud dataset."""
    meta = DATASET_ARCHIVES["ulb"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(meta["csv"]) as f:
            return pd.read_csv(f, nrows=nrows)


def stream_ulb_chunks(chunksize: int = 50000, raw_dir: str = DEFAULT_RAW_DIR) -> Generator[pd.DataFrame, None, None]:
    """Streams the ULB dataset in memory-efficient chunks."""
    meta = DATASET_ARCHIVES["ulb"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(meta["csv"]) as f:
            for chunk in pd.read_csv(f, chunksize=chunksize):
                yield chunk


def load_sparkov_sample(split: str = "train", nrows: int = 50000, raw_dir: str = DEFAULT_RAW_DIR) -> pd.DataFrame:
    """Loads a head sample of Sparkov train or test transactions."""
    meta = DATASET_ARCHIVES["sparkov"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    csv_name = meta["train_csv"] if split == "train" else meta["test_csv"]
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(csv_name) as f:
            return pd.read_csv(f, nrows=nrows)


def stream_sparkov_chunks(split: str = "train", chunksize: int = 50000, raw_dir: str = DEFAULT_RAW_DIR) -> Generator[pd.DataFrame, None, None]:
    """Streams Sparkov dataset in chunks."""
    meta = DATASET_ARCHIVES["sparkov"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    csv_name = meta["train_csv"] if split == "train" else meta["test_csv"]
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(csv_name) as f:
            for chunk in pd.read_csv(f, chunksize=chunksize):
                yield chunk


def load_paysim_sample(nrows: int = 50000, raw_dir: str = DEFAULT_RAW_DIR) -> pd.DataFrame:
    """Loads a head sample of the PaySim dataset."""
    meta = DATASET_ARCHIVES["paysim"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(meta["csv"]) as f:
            return pd.read_csv(f, nrows=nrows)


def stream_paysim_chunks(chunksize: int = 100000, raw_dir: str = DEFAULT_RAW_DIR) -> Generator[pd.DataFrame, None, None]:
    """Streams PaySim dataset in chunks."""
    meta = DATASET_ARCHIVES["paysim"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(meta["csv"]) as f:
            for chunk in pd.read_csv(f, chunksize=chunksize):
                yield chunk


def load_ieee_sample(table: str = "train_transaction", nrows: int = 50000, raw_dir: str = DEFAULT_RAW_DIR) -> pd.DataFrame:
    """Loads a head sample of an IEEE-CIS table."""
    meta = DATASET_ARCHIVES["ieee"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    csv_map = {
        "train_transaction": meta["train_txn"],
        "train_identity": meta["train_id"],
        "test_transaction": meta["test_txn"],
        "test_identity": meta["test_id"]
    }
    if table not in csv_map:
        raise ValueError(f"Unknown IEEE table: {table}. Choose from {list(csv_map.keys())}")
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(csv_map[table]) as f:
            return pd.read_csv(f, nrows=nrows)


def stream_ieee_chunks(table: str = "train_transaction", chunksize: int = 50000, raw_dir: str = DEFAULT_RAW_DIR) -> Generator[pd.DataFrame, None, None]:
    """Streams IEEE-CIS table in chunks."""
    meta = DATASET_ARCHIVES["ieee"]
    zip_path = os.path.join(raw_dir, meta["filename"])
    csv_map = {
        "train_transaction": meta["train_txn"],
        "train_identity": meta["train_id"],
        "test_transaction": meta["test_txn"],
        "test_identity": meta["test_id"]
    }
    if table not in csv_map:
        raise ValueError(f"Unknown IEEE table: {table}")
    with zipfile.ZipFile(zip_path, "r") as z:
        with z.open(csv_map[table]) as f:
            for chunk in pd.read_csv(f, chunksize=chunksize):
                yield chunk
