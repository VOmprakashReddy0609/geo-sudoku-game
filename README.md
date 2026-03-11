# Geo Sudoku Game

## Overview

**Geo Sudoku Game** is a browser-based logic puzzle application designed to help users practice game-based aptitude tests commonly used in technical placements. The game presents progressively harder puzzles where players must fill missing symbols while maintaining the rule that each symbol appears exactly once in every row and column.

The project is implemented using **HTML, CSS, and JavaScript**, focusing on logical puzzle generation, validation, and interactive gameplay.

## Features

### Progressive Difficulty

The game increases difficulty gradually as the player progresses.

| Stage        | Grid Size | Difficulty    |
| ------------ | --------- | ------------- |
| Beginner     | 3 × 3     | Easy puzzles  |
| Intermediate | 4 × 4     | Easy → Medium |
| Advanced     | 5 × 5     | Medium → Hard |

### Core Game Rules

1. Each **row must contain unique symbols**.
2. Each **column must contain unique symbols**.
3. No symbol can repeat within the same row or column.
4. Players must identify the correct symbol for the highlighted cell.

### Gameplay Elements

* Dynamic puzzle generation
* Interactive symbol selection
* Score tracking
* Timer-based gameplay
* Progressive level advancement
* Puzzle validation engine
* Clean grid-based UI

## Tech Stack

| Technology | Purpose                                   |
| ---------- | ----------------------------------------- |
| HTML       | Structure of the game interface           |
| CSS        | Layout and styling                        |
| JavaScript | Game logic, puzzle generation, validation |

## Project Structure

geo-sudoku-game
│
├── index.html
│
├── styles
│   └── style.css
│
├── js
│   ├── board.js
│   ├── game.js
│   ├── generator.js
│   ├── regions.js
│   ├── solver.js
│   └── validator.js


## How to Run the Project

1. Clone the repository

```
git clone https://github.com/VOmprakashReddy0609/geo-sudoku-game.git
```

2. Navigate to the project folder

```
cd geo-sudoku-game
```

3. Open the game

```
index.html
```

Open the file in any modern browser such as Chrome, Edge, or Firefox.

---

## Learning Objectives

This project demonstrates concepts such as:

* Constraint satisfaction problems
* Puzzle generation algorithms
* Backtracking solvers
* UI state management
* Event-driven JavaScript programming

## Future Improvements

* Unique-solution puzzle generation
* Hint system
* Leaderboard and scoring analytics
* Mobile responsive layout
* Advanced irregular Geo-Sudoku regions
* Sound effects and animations

## Author

**Om Prakash Reddy Vanampally**
Computer Science Engineering
MVSR Engineering College

GitHub:
https://github.com/VOmprakashReddy0609
