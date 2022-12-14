from flask import Flask, json, request

def predictApproach(aircraftData):
    import pandas as pd 
    uri = "./data/approaches_history.json"
    dados = pd.read_json(uri)

    dados = dados.drop(columns=["atOneThousandAFE","lat","lng","altitude_agl"], axis=1)
    dados["stabilized"] = dados["stabilized"]
    dados["speedbrake"] = round(dados["speedbrake"],2)

    parametersAtIF = dados.drop(columns=["stabilized","pitch","bank"],axis=1)
    resultOfApproach = dados.stabilized
    
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import accuracy_score
    import numpy as np

    SEED = 50
    np.random.seed(SEED)

    treino_x, teste_x, treino_y, teste_y = train_test_split(parametersAtIF, resultOfApproach, test_size=0.20)

    print("Treinaremos com %d elementos e testaremos com %d elementos\n" % (len(treino_x), len(teste_x)))

    modelo = RandomForestClassifier(n_estimators = 500)
    modelo.fit(treino_x,treino_y)

    acuracia = modelo.score(teste_x,teste_y)
    print("A acurácia foi %.2f%%\n" % (acuracia*100))
    #previsao_teste = modelo.predict(teste_x)
    #[altitude_msl, v_speed, gs, ias, gw, geardown, speedbrake, flaps]
    #[4700,0,200,190,64000,0,0,0.25]
    aircraftData[6] = round(aircraftData[6],2)
    predict = modelo.predict([aircraftData])
    
    return predict[0]
    
# companies = [{"id": 1, "name": "Company One"}, {"id": 2, "name": "Company Two"}]

api = Flask(__name__)

# @api.route('/companies', methods=['GET'])
# def get_companies():
#     return json.dumps(companies)

@api.route('/predict', methods=['POST'])
def post_predict():
    data = request.get_json()
    resultOfApproach = predictApproach(data)
    #print(data)
    return json.dumps({"willStabilize":bool(resultOfApproach)}), 200

if __name__ == '__main__':
    api.run(port=1013)
    


    

