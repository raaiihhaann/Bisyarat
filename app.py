from flask import Flask, render_template, request, jsonify # type: ignore
from model.predict import predict_letter
import time  

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/prediksi')
def prediksi():
    return render_template('prediksi.html')

@app.route('/predict', methods=['POST'])
def predict_api():
    data = request.get_json()

    start_time = time.time()
    result = predict_letter(data.get('keypoints'))
    end_time = time.time()

    inference_time = end_time - start_time
    print(f"[INFO] Inference time: {inference_time:.4f} seconds")

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)