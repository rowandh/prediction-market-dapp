var PredictionMarket = artifacts.require("./PredictionMarket.sol");
const expectedExceptionPromise = require('./expected_exception_testRPC_and_geth');

contract("PredictionMarket", (accounts) => {
  let instance;
  let description = "Test";
  let identifier = web3.sha3(description);
  let notOwner = accounts[1];
  
  const unresolvedOutcome = 0;
  const yesOutcome = 1;
  const noOutcome = 2;
  const undecidedOutcome = 3;

  it("should create a binary option with correct properties", () => {

    return PredictionMarket.deployed().then((i) => {
      instance = i;
      return i.addBinaryOption(identifier, description, 100);
    })
    .then((txHash) => {
      return instance.binaryOptions.call(identifier);
    })
    .then(option => {
      assert.equal(description, option[0]); // description
      assert.isTrue(option[1].gt(0)); //expiryblock
      assert.equal(false, option[2]); //resolved
      assert.equal(0, option[3]); //Outcome enum (0)
      assert.isFalse(!!option[4]); //balances
    })
  });

  it("only owner can create an option", () => {
    return PredictionMarket.deployed()
      .then(instance => {
          return expectedExceptionPromise(() => {
            return instance.addBinaryOption(identifier, description, 100, { from: notOwner });
          });
      });
  });

  it("should not create the same option twice", () => {
    return PredictionMarket.deployed()
      .then(i => {
          instance = i;
          return instance.addBinaryOption(web3.sha3("same"), description, 100);
      })
      .then(() => {
        return expectedExceptionPromise(() => {
          return instance.addBinaryOption(web3.sha3("same"), description, 100);        
        });
      });
  });

  it("should create a prediction with correct amount and outcome", () => {
    const testPrediction = web3.sha3("should create a prediction with correct amount and outcome");
    const predictionValue = 100;
    const predictionOutcome = 1; //Yes

    return PredictionMarket.deployed()
    .then(i => {
      instance = i;
      return i.addBinaryOption(testPrediction, description, 100);
    })
    .then(() => {        
        return instance.predict(testPrediction, predictionOutcome, { value: predictionValue });
    })
    .then(() => {
      return instance.predictions.call(accounts[0], testPrediction);
    })
    .then(prediction => {
      assert.equal(""+predictionValue, prediction[0].toString(10)); // Amount
      assert.equal(""+predictionOutcome, prediction[1].toString(10)); // Prediction
    });
  });

  // it("should increase outcome balance for a prediction", () => {
  //   const testPrediction = web3.sha3("should increase outcome balance for a prediction");
  //   const predictionValue = 100;
  //   const predictionOutcome = 1; //Yes

  //   return PredictionMarket.deployed()
  //     .then(i => {
  //       instance = i;
  //       return i.addBinaryOption(testPrediction, description, 100);
  //     })
  //     .then(() => {
  //       return instance.binaryOptions.call(testPrediction);
  //     })
  //     .then(option => {
  //       console.log(option);        
  //     })
  //     .then(() => {        
  //         return instance.predict(testPrediction, predictionOutcome, { value: predictionValue });
  //     })
  //     .then(() => {
  //       return instance.predictions.call(accounts[0], testPrediction);
  //     })
  //     .then(prediction => {
  //       assert.equal(""+predictionValue, prediction[0].toString(10)); // Amount
  //       assert.equal(""+predictionOutcome, prediction[1].toString(10)); // Prediction
  //     });
  // });  

  it("should not allow unresolved predictions", () => {

    const testPrediction = web3.sha3("should not allow unresolved predictions");
    
    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return expectedExceptionPromise(() => {          
          return i.predict(testPrediction, unresolvedOutcome, { value: 123 })
        });              
      });
  });

  it("should not allow undecided predictions", () => {
    
    const testPrediction = web3.sha3("should not allow undecided predictions");
    
    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return expectedExceptionPromise(() => {          
          return i.predict(testPrediction, undecidedOutcome, { value: 123 })
        });              
      });
  });
  
  it("should not allow other predictions", () => {
    
    const testPrediction = web3.sha3("should not allow other predictions");
    
    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return expectedExceptionPromise(() => {          
          return i.predict(testPrediction, 1234, { value: 123 })
        });              
      });
  });   

  it("should allow yes predictions", () => {
    
    const testPrediction = web3.sha3("should allow yes predictions");
    
    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return i.predict(testPrediction, yesOutcome, { value: 123 })
      })
      .then(() => {
          return instance.predictions.call(accounts[0], testPrediction);
      })
      .then(prediction => {
        assert.equal("123", prediction[0].toString(10));
      });
  }); 


  it("should allow no predictions", () => {
    
    const testPrediction = web3.sha3("should allow no predictions");
    
    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return i.predict(testPrediction, noOutcome, { value: 123 })
      })
      .then(() => {
          return instance.predictions.call(accounts[0], testPrediction);
      })
      .then(prediction => {
        assert.equal("123", prediction[0].toString(10));
      });
  });

});