from flask import Flask, render_template
import random

app = Flask(__name__)

SCREEN_WIDTH = 640
SCREEN_HEIGHT = 480
BALL_SIZE = 20
PADDLE_WIDTH = 10
PADDLE_HEIGHT = 100
PADDLE_SPEED = 5
BALL_SPEED = 5

player1_score = 0
player2_score = 0


@app.route("/")
def index():
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True)
