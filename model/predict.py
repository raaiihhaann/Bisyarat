import numpy as np
from tensorflow.keras.models import load_model # type: ignore

model = load_model("model/model_cnn.keras")
vowels = np.load("model/label_classes.npy")  

def predict_letter(keypoints):
    if not keypoints or len(keypoints) != 126:
        return {'error': 'Jumlah keypoints salah'}

    input_data = np.array(keypoints, dtype=np.float32).reshape(1, 126, 1)
    prediction = model.predict(input_data, verbose=0)

    pred_index = np.argmax(prediction)
    pred_letter = vowels[pred_index]
    confidence = float(prediction[0][pred_index])

    return {'prediction': pred_letter, 'confidence': confidence}