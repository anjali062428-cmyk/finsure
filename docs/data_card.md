# FinSure Dataset Card

**Document Version:** 1.0  
**Date:** 28 September 2026  
**Status:** Initialized & Verified (Phase 1)  

---

## 1. Dataset Strategy & Architecture Overview

FinSure uses a tiered, multi-dataset strategy aligned with the Master Prompt and formal SRS:
1. **Primary Integrated Dataset:** **FinSure Synthetic UPI** dataset (custom-built, seeded, reproducible). Contains realistic Indian banking entities: users, VPAs, devices, merchants, login/limit-change event streams, and targeted fraud topologies (account takeover, mule rings, collect-request scams, card testing).
2. **Public Benchmark Datasets:** Used strictly as external baselines, sanity checks, and component-specific validations. **They are never pooled or blindly concatenated into a single training table.**

---

## 2. Benchmark Datasets Inventory

### 2.1 ULB Credit Card Fraud
- **Source:** Université Libre de Bruxelles / Kaggle
- **Local File:** `data/raw/archive (10).zip`
- **Archive Size:** 69,155,672 bytes (65.95 MB)
- **SHA-256 (Archive):** `a0360ce715992212e9ac72d8ccdca97f4be87dc1fdf2bed011358f7ab409a28a`
- **Internal File:** `creditcard.csv` (143.84 MB uncompressed)
- **Row Count:** 284,807 transactions
- **Column Count:** 31 columns (`Time`, `V1`–`V28` PCA features, `Amount`, `Class`)
- **Data Types:** Numerical (`float64` for `V1`–`V28`, `Amount`; `int64` for `Time`, `Class`)
- **Target Column:** `Class`
  - Fraud (1): 492 (0.1727%)
  - Legit (0): 284,315 (99.8273%)
- **Time Field:** `Time` (seconds elapsed since first transaction in dataset, spans ~48 hours)
- **Missingness:** 0 missing values across all 31 columns (100% complete)
- **Intended Role in FinSure:** Tabular baseline for extreme class imbalance handling (Focal loss vs class-weighted vs fold-safe SMOTE).

---

### 2.2 Sparkov Credit Card Transactions
- **Source:** Sparkov Data Generation tool / Kaggle
- **Local File:** `data/raw/archive (8).zip`
- **Archive Size:** 211,766,662 bytes (201.96 MB)
- **SHA-256 (Archive):** `4e32829b9ba5a6b17af707c513c15204011044df0e8971e431cedca3d8c0a8a1`
- **Internal Files:**
  - `fraudTrain.csv` (334.97 MB uncompressed): 1,296,675 rows
  - `fraudTest.csv` (143.39 MB uncompressed): 555,719 rows
- **Column Count:** 23 columns (`trans_date_trans_time`, `cc_num`, `merchant`, `category`, `amt`, `first`, `last`, `gender`, `street`, `city`, `state`, `zip`, `lat`, `long`, `city_pop`, `job`, `dob`, `trans_num`, `unix_time`, `merch_lat`, `merch_long`, `is_fraud`)
- **Data Types:** Categorical/Text (`str`), Geographic (`float64`), Temporal (`unix_time` int64, `trans_date_trans_time` string), Amount (`float64`), Target (`int64`)
- **Target Column:** `is_fraud`
  - `fraudTrain.csv`: 7,506 fraud (0.5789%), 1,289,169 legit
  - `fraudTest.csv`: 2,145 fraud (0.3860%), 553,574 legit
- **Time Fields:** `trans_date_trans_time` (formatted datetime string), `unix_time` (epoch integer), `dob` (date of birth string)
- **Missingness:** 0 missing values across all 23 columns (100% complete)
- **Intended Role in FinSure:** Sequence model benchmark; user-level transaction histories, temporal rhythm, and geographic displacement.

---

### 2.3 PaySim Mobile Money Fraud
- **Source:** PaySim Synthetic Financial Simulator / Kaggle (Lopez-Rojas et al.)
- **Local File:** `data/raw/archive (9).zip`
- **Archive Size:** 186,385,561 bytes (177.75 MB)
- **SHA-256 (Archive):** `f7eef9ffad5cfa64a034143a5c9b30491d189420b273d5ad5723ca40b596613d`
- **Internal File:** `PS_20174392719_1491204439457_log.csv` (470.67 MB uncompressed)
- **Row Count:** 6,362,620 transactions
- **Column Count:** 11 columns (`step`, `type`, `amount`, `nameOrig`, `oldbalanceOrg`, `newbalanceOrig`, `nameDest`, `oldbalanceDest`, `newbalanceDest`, `isFraud`, `isFlaggedFraud`)
- **Data Types:** Categorical (`type`, `nameOrig`, `nameDest`), Numerical balances & amount (`float64`), Temporal step (`int64`), Binary targets (`int64`)
- **Target Column:** `isFraud`
  - Fraud (1): 8,213 (0.1291%)
  - Legit (0): 6,354,407 (99.8709%)
- **Time Field:** `step` (simulated hourly unit, 1 step = 1 hour, spans 744 steps / 31 days)
- **Missingness:** 0 missing values across all 11 columns
- **Intended Role in FinSure:** Relationship and graph sanity check; account-to-account transfer topology (`nameOrig` -> `nameDest`).

---

### 2.4 IEEE-CIS Fraud Detection
- **Source:** Vesta Corporation / IEEE Computational Intelligence Society / Kaggle
- **Local File:** `data/raw/ieee-fraud-detection.zip`
- **Archive Size:** 123,856,947 bytes (118.12 MB)
- **SHA-256 (Archive):** `4cc646da09d0a9b265983ffed775b1f9ee15af5266586df610e04d6adae0b829`
- **Internal Files:**
  - `train_transaction.csv` (651.69 MB uncompressed): 590,540 rows, 394 columns
  - `train_identity.csv` (25.30 MB uncompressed): 144,233 rows, 41 columns
  - `test_transaction.csv` (584.79 MB uncompressed): 506,691 rows, 393 columns
  - `test_identity.csv` (24.60 MB uncompressed): 141,907 rows, 41 columns
- **Data Types:** Mixed high-dimensional tabular (numerical `float64`, categorical `str`, masked engineered counters `C1`–`C14`, timing `D1`–`D15`, Vesta engineered features `V1`–`V339`)
- **Target Column:** `isFraud`
  - `train_transaction.csv`: 20,663 fraud (3.4990%), 569,877 legit
- **Time Field:** `TransactionDT` (timedelta in seconds from a reference point)
- **Missingness:** High sparsity; 319 out of 394 columns in `train_transaction.csv` have missing values (e.g. `dist1` 69.65%, `D8` 78.29%, `R_emaildomain` 65.45%).
- **Intended Role in FinSure:** Rich tabular feature engineering benchmark; comparison baseline for XGBoost and SHAP explanation generation.

---

## 3. Reference Documents & Papers

| Document | File Path | Size (KB) | SHA-256 | Description & Purpose |
|---|---|---|---|---|
| **IBM Synthetic AML** | `reference/IBM_Synthetic_AML-Data.pdf` | 350.0 KB | `995afebdac5e87eaba1bb790239efab1f50849e843d32d415e2ee52c37a024c9` | Reference paper (Altman et al.) on synthetic money laundering topologies, fan-out/fan-in mule patterns, and cycle detection. |
| **Bank Account Fraud (BAF)** | `reference/NeurIPS-2022-...Paper.pdf` | 311.8 KB | `b05cfbe15916173c0ae79728cd6e314ebd92ad82191ea7ddf2929a3280373641` | NeurIPS 2022 paper on realistic dynamic tabular fraud evaluation, dynamic time splits, concept drift, and performance disparity. |
| **Sample Analyst Report** | `reference/reports/FinSure_FS-2026-000481_analyst.pdf` | 129.4 KB | `13ea1e437fb109744ff27623c2a1f382d2f06062de68407e7e656afa320d5df4` | Concrete prototype artifact for WeasyPrint PDF layout, case structure, SHAP charts, and QR code verification. |

---

## 4. FinSure Synthetic UPI Dataset Specification

- **Role:** Primary integrated training, validation, and live demo dataset.
- **Generator Location:** `ml/data/synthetic_generator.py`
- **Config:** `ml/data/generator_config.yaml`
- **Entities:** Users, VPAs/Payees, Devices, IP/Geo locations, Events, Transactions, Labels.
- **Fraud Typologies Injected:**
  1. `account_takeover`: Login on new device/IP, payee added, daily limit raised, high amount transfer during unusual hours.
  2. `mule_account`: Multiple victim accounts funneling funds into a shared payee/device with immediate rapid disbursement.
  3. `collect_request_scam`: Inverted payment request disguised as a refund or prize receipt.
  4. `phishing_or_social_engineering`: Urgent payments to fresh VPAs following deceptive calls or fake customer support.
  5. `card_testing`: Micro-transfers (< Rs 100) followed by a spike in volume.
- **Realism Knobs:**
  - Label noise (1–3%)
  - Overlapping feature distributions (hard negatives: legitimate night travel, new device upgrade)
  - Delayed fraud confirmations
  - Time-split concept drift (unseen fraud signature in test fold for zero-day autoencoder evaluation)
