from flask import Flask, render_template, request, jsonify # type: ignore
from model.predict import predict_letter
import time  
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/prediksi')
def prediksi():
    return render_template('prediksi.html')

@app.route('/predict', methods=['POST'])
def predict_api():
    from model.predict import predict_letter  
    data = request.get_json()
    
    start_time = time.time()
    result = predict_letter(data.get('keypoints'))
    end_time = time.time()

    inference_time = end_time - start_time
    print(f"[INFO] Inference time: {inference_time:.4f} seconds")

    return jsonify(result)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
