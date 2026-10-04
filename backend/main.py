from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
import copy

app = FastAPI()

# ------------------ INITIAL BOARD ------------------ #

INITIAL_BOARD = [
    [5,3,0,0,7,0,0,0,0],
    [6,0,0,1,9,5,0,0,0],
    [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3],
    [4,0,0,8,0,3,0,0,1],
    [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0],
    [0,0,0,4,1,9,0,0,5],
    [0,0,0,0,8,0,0,7,9]
]

# ------------------ HELPERS ------------------ #

def is_fixed(row, col):
    return INITIAL_BOARD[row][col] != 0

def is_valid(board, row, col, value):
    # Row
    for c in range(9):
        if c != col and board[row][c] == value:
            return False

    # Column
    for r in range(9):
        if r != row and board[r][col] == value:
            return False

    # 3x3 Box
    start_row = (row // 3) * 3
    start_col = (col // 3) * 3

    for r in range(start_row, start_row + 3):
        for c in range(start_col, start_col + 3):
            if (r != row or c != col) and board[r][c] == value:
                return False

    return True

# ------------------ ROOM STATE ------------------ #

rooms = {}  # room_id -> { "connections": [], "board": [...] }

# ------------------ WEBSOCKET ------------------ #

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):

    # Limit 2 players per room
    if room_id in rooms and len(rooms[room_id]["connections"]) >= 2:
        await websocket.close()
        return

    await websocket.accept()

    # Create room if not exists
    if room_id not in rooms:
        rooms[room_id] = {
            "connections": [],
            "board": copy.deepcopy(INITIAL_BOARD)
        }

    rooms[room_id]["connections"].append(websocket)

    # Send current board to new client
    await websocket.send_text(json.dumps({
        "type": "init",
        "board": rooms[room_id]["board"]
    }))

    try:
        while True:
            data = await websocket.receive_text()
            move = json.loads(data)

            row = move["row"]
            col = move["col"]
            value = move["value"]

            board = rooms[room_id]["board"]

            # Block fixed cells
            if is_fixed(row, col):
                continue

            # Validate move
            if value != "" and not is_valid(board, row, col, value):
                continue

            # Update server state
            board[row][col] = value

            # Broadcast to all clients
            for conn in rooms[room_id]["connections"]:
                await conn.send_text(json.dumps(move))

    except WebSocketDisconnect:
        rooms[room_id]["connections"].remove(websocket)

        # Cleanup empty room
        if not rooms[room_id]["connections"]:
            del rooms[room_id]