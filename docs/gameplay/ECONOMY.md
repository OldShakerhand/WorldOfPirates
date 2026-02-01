# Economy System

## Overview

The economy system enables players to buy and sell goods at harbors. Prices are **dynamic per region**, creating profitable trade routes between different parts of the Caribbean.

## Trading Basics

### How to Trade

### How to Trade

1.  **Dock at a harbor** (Press `H` near a harbor).
2.  **Open Trade Goods** in the UI.
3.  **Buy Low (Green Badge)**: Look for goods marked **CHEAP**.
4.  **Sell High (Orange Badge)**: Look for goods marked **EXPENSIVE**.
5.  **Select Quantity** or use **Buy All / Sell All**:
    - **Buy All**: Purchases maximum amount based on Gold and Cargo Space.
    - **Sell All**: Sells entire inventory of selected good.

### Validation

Trades are validated **server-side** (Authoritative):
-   ✅ Docked at harbor.
-   ✅ Sufficient Gold (Buy) / Cargo (Sell).
-   ✅ Good available in harbor.
-   ✅ Transaction limits (cap at 100 items per request).

## Goods & Pricing

Prices are derived from a **Base Price** modified by a **Regional Tier**.

### Base Prices
| Good | Category | Base Price | Space | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Food** | Food | 5g | 1 | Basic necessity |
| **Wood** | Material | 10g | 1 | Ship repairs |
| **Cloth** | Material | 15g | 1 | Sails & clothing |
| **Sugar** | Luxury | 30g | 1 | Cash crop |
| **Rum** | Luxury | 50g | 1 | Refined good |
| **Tobacco** | Luxury | 80g | 1 | Premium luxury |
| **Contraband** | Illegal | 200g | 1 | **Mission Only** |

### Price Tiers (Regional Supply/Demand)

Each region assigns a tier to every good:

| Tier | UI Badge | Price Multiplier | Description |
| :--- | :--- | :--- | :--- |
| **EXPORT** | <span style="color:green">CHEAP</span> | **0.6x** | High supply, locally produced. |
| **STANDARD** | (None) | **1.0x** | Normal market price. |
| **IMPORT** | <span style="color:orange">EXPENSIVE</span> | **1.4x** | High demand, scarce. |

### Harbor Margin
Harbors always sell for slightly more than they buy (Margin: 0.75).
-   **Player Buys**: `Base * Tier * Variation`
-   **Player Sells**: `BuyPrice * 0.75`

### Local Variation
Every harbor has a deterministic price variation of **±5%** to add flavor.

## Regional Trade Profiles

Harbors are assigned one of 6 trade profiles based on geography:

1.  **FRONTIER (Bahamas/Florida)**
    -   **Exports**: Food, Wood
    -   **Imports**: Cloth, Rum
    -   *Strategy*: Buy cheap wood here, sell in Luxury regions.

2.  **PLANTATION (Cuba/Jamaica)**
    -   **Exports**: Sugar, Tobacco
    -   **Imports**: Cloth, Iron (Tools)
    -   *Strategy*: The breadbasket of the Caribbean.

3.  **MAINLAND (Mexico/Yucatan)**
    -   **Exports**: Wood, Silver (abstracted)
    -   **Imports**: Finished Goods
    -   *Strategy*: Raw resource extraction.

4.  **LUXURY (Lesser Antilles)**
    -   **Exports**: Rum, Sugar
    -   **Imports**: Food, Wood
    -   *Strategy*: Refines raw sugar into expensive Rum.

5.  **CAPITAL (Spanish Main)**
    -   **Exports**: Cloth, Tools
    -   **Imports**: All Luxuries (Sugar, Tobacco, Rum)
    -   *Strategy*: Rich consumers pay top dollar for luxuries.

6.  **PIRATE HAVEN (Tortuga/Nassau)**
    -   **Exports**: Rum (Stolen)
    -   **Imports**: Tobacco, Cloth
    -   *Strategy*: High risk, high reward.

## Technical Details

-   **Config**: `src/server/game/config/GameConfig.js` defines Base Prices and Tiers.
-   **Profiles**: `assets/harbor_trade_profiles.json` defines goods per region.
-   **Logic**: `HarborRegistry.js` calculates final prices dynamically.
-   **Validation**: `EconomySystem.js` handles transactions securely.
