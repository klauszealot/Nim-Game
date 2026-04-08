import sys
import json
import time
import random

EASY_MAX_DEPTH = 4

def get_max_take(sticks):
    return 6 if sticks > 30 else 3

def run_minimax(sticks_left, maximizing_turn, depth, stats, cache):
    stats["nodes"] += 1
    stats["maxDepth"] = max(stats["maxDepth"], depth)
    key = f"{sticks_left}-{1 if maximizing_turn else 0}"
    
    if key in cache:
        return cache[key]
    
    if sticks_left <= 0:
        terminal_score = 1 if maximizing_turn else -1
        cache[key] = terminal_score
        return terminal_score
    
    best = float('-inf') if maximizing_turn else float('inf')
    max_move = min(get_max_take(sticks_left), sticks_left)
    
    for move in range(1, max_move + 1):
        score = run_minimax(sticks_left - move, not maximizing_turn, depth + 1, stats, cache)
        if maximizing_turn:
            best = max(best, score)
        else:
            best = min(best, score)
            
    cache[key] = best
    return best

def run_alpha_beta(sticks_left, maximizing_turn, alpha, beta, depth, stats, cache):
    stats["nodes"] += 1
    stats["maxDepth"] = max(stats["maxDepth"], depth)
    key = f"{sticks_left}-{1 if maximizing_turn else 0}"
    
    if key in cache:
        return cache[key]
        
    if sticks_left <= 0:
        terminal_score = 1 if maximizing_turn else -1
        cache[key] = terminal_score
        return terminal_score
        
    best = float('-inf') if maximizing_turn else float('inf')
    max_move = min(get_max_take(sticks_left), sticks_left)
    
    for move in range(1, max_move + 1):
        score = run_alpha_beta(sticks_left - move, not maximizing_turn, alpha, beta, depth + 1, stats, cache)
        if maximizing_turn:
            best = max(best, score)
            alpha = max(alpha, best)
        else:
            best = min(best, score)
            beta = min(beta, best)
            
        if beta <= alpha:
            break
            
    cache[key] = best
    return best

def benchmark_algorithm(algorithm, sticks_left):
    stats = {"nodes": 0, "maxDepth": 0}
    cache = {}
    
    t0 = time.perf_counter()
    legal = []
    max_move = min(get_max_take(sticks_left), sticks_left)
    for move in range(1, max_move + 1):
        legal.append(move)
        
    best_moves = []
    best_score = float('-inf')
    
    for move in legal:
        next_sticks = sticks_left - move
        if algorithm == "minimax":
            score = run_minimax(next_sticks, False, 1, stats, cache)
        else:
            score = run_alpha_beta(next_sticks, False, float('-inf'), float('inf'), 1, stats, cache)
            
        if score > best_score:
            best_score = score
            best_moves = [move]
        elif score == best_score:
            best_moves.append(move)
            
    best_move = random.choice(best_moves) if best_moves else (legal[0] if legal else 1)
    
    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    
    return {
        "bestMove": best_move,
        "bestScore": best_score,
        "nodes": stats["nodes"],
        "maxDepth": stats["maxDepth"],
        "elapsedMs": elapsed_ms
    }

def run_benchmark(sticks_left):
    minimax = benchmark_algorithm("minimax", sticks_left)
    alpha_beta = benchmark_algorithm("alphabeta", sticks_left)
    return {"minimax": minimax, "alphaBeta": alpha_beta}

def run_minimax_easy(sticks_left, maximizing_turn, depth, stats):
    stats["nodes"] += 1
    stats["maxDepth"] = max(stats["maxDepth"], depth)
    if sticks_left <= 0:
        return 1 if maximizing_turn else -1
    if depth >= EASY_MAX_DEPTH:
        return 0
        
    best = float('-inf') if maximizing_turn else float('inf')
    max_move = min(get_max_take(sticks_left), sticks_left)
    for move in range(1, max_move + 1):
        score = run_minimax_easy(sticks_left - move, not maximizing_turn, depth + 1, stats)
        if maximizing_turn:
            best = max(best, score)
        else:
            best = min(best, score)
    return best

def choose_ai_move(sticks_left, difficulty):
    if sticks_left <= 0:
        return {"bestMove": 1, "comparison": run_benchmark(sticks_left)}
        
    legal_moves = []
    max_move = min(get_max_take(sticks_left), sticks_left)
    for move in range(1, max_move + 1):
        legal_moves.append(move)
        
    comparison = run_benchmark(sticks_left)
    
    if difficulty == "easy":
        easy_stats = {"nodes": 0, "maxDepth": 0}
        best_moves = []
        best_score = float('-inf')
        for move in legal_moves:
            score = run_minimax_easy(sticks_left - move, False, 1, easy_stats)
            if score > best_score:
                best_score = score
                best_moves = [move]
            elif score == best_score:
                best_moves.append(move)
        
        final_move = random.choice(best_moves) if best_moves else (legal_moves[0] if legal_moves else 1)
        return {"bestMove": final_move, "comparison": comparison}
        
    elif difficulty == "normal":
        return {"bestMove": comparison["minimax"]["bestMove"], "comparison": comparison}
        
    else:  # hard
        return {"bestMove": comparison["alphaBeta"]["bestMove"], "comparison": comparison}

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            return
            
        data = json.loads(input_data)
        sticks_left = data.get("sticksLeft", 0)
        difficulty = data.get("difficulty", "normal")
        
        result = choose_ai_move(sticks_left, difficulty)
        
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
