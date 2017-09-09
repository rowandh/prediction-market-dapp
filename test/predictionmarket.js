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
      assert.equal(0, option[4]); //Total balance
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

  it("should increase outcome balance for a prediction", () => {
    const testPrediction = web3.sha3("should increase outcome balance for a prediction");
    const predictionValue = 12345;
    const predictionOutcome = 1; //Yes
    let initialBalance;

    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return i.addBinaryOption(testPrediction, description, 100);
      })
      .then(() => {
        return instance.getOutcomeBalance.call(testPrediction, predictionOutcome);
      })
      .then(bal => {
        initialBalance = bal;
      })
      .then(() => {        
          return instance.predict(testPrediction, predictionOutcome, { value: predictionValue });
      })
      .then(() => {
        return instance.getOutcomeBalance.call(testPrediction, predictionOutcome);
      })
      .then(bal => {
        assert.equal(predictionValue, bal - initialBalance); // Amount        
      });
  });

  it("should return the correct total balance", () => {
    const testPrediction = web3.sha3("should return the correct total balance");
    const predictionValue1 = 12345;
    const predictionValue2 = 9876;
    let initialBalance;

    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return i.addBinaryOption(testPrediction, description, 100);
      })
      .then(() => {
        return instance.getTotalBalance.call(testPrediction);
      })
      .then(bal => {
        initialBalance = bal;
      })
      .then(() => {        
          return instance.predict(testPrediction, yesOutcome, { value: predictionValue1 });
      })
      .then(() => {        
        return instance.predict(testPrediction, noOutcome, { value: predictionValue2, from: accounts[1] });
      })      
      .then(() => {
        return instance.getTotalBalance.call(testPrediction);
      })
      .then(bal => {
        assert.equal(predictionValue1 + predictionValue2, bal - initialBalance); // Amount        
      });
  }); 

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

  it("should pay out correctly", () => {
    const testPrediction = web3.sha3("should pay out correctly");
    let initialAccountBalance, finalAccountBalance;
    let totalBalanceBefore, totalBalanceAfter;
    let gasUsed, gasPrice;

    return PredictionMarket.deployed()
      .then(i => {
        instance = i;
        return i.addBinaryOption(testPrediction, description, 100);
      })
      .then(() => {
        return instance.getTotalBalance.call(testPrediction);
      })
      .then(_totalBalanceBefore => {
        totalBalanceBefore = _totalBalanceBefore;
      })         
      .then(() => {        
          return instance.predict(testPrediction, yesOutcome, { value: 1000, from: accounts[0] });
      })
      .then(() => {        
        return instance.predict(testPrediction, yesOutcome, { value: 3000, from: accounts[1] });
      })        
      .then(() => {        
        return instance.predict(testPrediction, noOutcome, { value: 12000, from: accounts[2] });
      })          
      .then(() => {
        return instance.resolveBinaryOption(testPrediction, yesOutcome);
      })
      .then(_initialAccountBalance => {
        initialAccountBalance = _initialAccountBalance;
        return web3.eth.getBalance(accounts[0])
      })
      .then(_initialAccountBalance => {
        initialAccountBalance = _initialAccountBalance;                       
        return instance.requestPayout(testPrediction);
      })      
      .then(tx => {
        gasUsed = tx.receipt.gasUsed;
        return web3.eth.getTransaction(tx.receipt.transactionHash);
      })
      .then(tx => {
        gasPrice = tx.gasPrice;
        return web3.eth.getBalance(accounts[0]);        
      })
      .then(_finalAccountBalance => {
        finalAccountBalance = _finalAccountBalance;      
        return instance.getTotalBalance.call(testPrediction);
      })
      .then(_totalBalanceAfter => {
        totalBalanceAfter = _totalBalanceAfter;
      })
      .then(() => {
        const gasCost = gasPrice.times(gasUsed);
        assert.isTrue(finalAccountBalance.minus(initialAccountBalance).plus(gasCost).eq(4000));
        assert.equal(12000, totalBalanceAfter.minus(totalBalanceBefore).toString(10));
      });
  }); 

});