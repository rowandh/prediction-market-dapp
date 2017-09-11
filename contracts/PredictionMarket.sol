pragma solidity ^0.4.15;

contract PredictionMarket {

    address public owner;

    struct BinaryOption {
        string description;
        uint expiryBlock;
        bool resolved;
        Outcome outcome;
        uint totalBalance;                
        mapping(uint8 => uint) balances; // Outcome => balance
    }

    struct Prediction {
        uint amount;
        Outcome predictedOutcome;
        bool paidOut;
    }

    mapping(bytes32 => BinaryOption) public binaryOptions;

    mapping(address => mapping(bytes32 => Prediction)) public predictions;

    enum Outcome { Unresolved, Yes, No, Undecided }

    function PredictionMarket() {
        owner = msg.sender;
    }

    function getOutcomeBalance(bytes32 identifier, Outcome outcome)
        isValidOutcome(outcome)
        public 
        constant 
        returns(uint balance) {
            return binaryOptions[identifier].balances[uint8(outcome)];
    }

    function getTotalBalance(bytes32 identifier) 
        public
        constant 
        returns(uint totalBalance) {
            return binaryOptions[identifier].totalBalance;
    }    
        
    function addBinaryOption(bytes32 identifier, string description, uint durationInBlocks)
        isOwner()
        public returns(bool success) {
        
        // Don't allow options with no expiry
        require(durationInBlocks > 0);

        // Check that this option does not exist already
        require(binaryOptions[identifier].expiryBlock == 0);

        BinaryOption memory option;
        option.expiryBlock = block.number + durationInBlocks;
        option.description = description;
        option.resolved = false;
        option.outcome = Outcome.Unresolved;

        binaryOptions[identifier] = option;

        return true;
    }

    function predict(bytes32 identifier, Outcome outcome) 
        isValidOutcome(outcome)
        payable returns(bool success) {

        // Must back your prediction
        require(msg.value > 0);

        // Require that the option exists
        require(binaryOptions[identifier].expiryBlock > 0);

        // Require that the option has not expired
        require(binaryOptions[identifier].expiryBlock >= block.number);

        // Require that the option has not been resolved
        require(!binaryOptions[identifier].resolved);

        // Don't allow duplicate bets
        require(predictions[msg.sender][identifier].amount == 0);

        BinaryOption storage option = binaryOptions[identifier];

        option.balances[uint8(outcome)] += msg.value;
        option.totalBalance += msg.value;

        Prediction memory prediction;
        prediction.amount = msg.value;
        prediction.predictedOutcome = outcome;
        predictions[msg.sender][identifier] = prediction;

        return true;
    }

    // Mark the option as resolved so that an outcome can be set
    // This must be done in a separate block from setting an outcome
    function resolveBinaryOption(bytes32 identifier) 
        isOwner()
        public 
        returns(bool success) {

        BinaryOption storage option = binaryOptions[identifier];
        option.resolved = true;
        
        return true;
    }

    function setOptionOutcome(bytes32 identifier, Outcome outcome) 
        isOwner()
        public
        returns(bool success) {
        
        require(outcome == Outcome.Yes || outcome == Outcome.No || outcome == Outcome.Undecided);
        
        BinaryOption storage option = binaryOptions[identifier];
        
        require(option.resolved);
        
        option.outcome = outcome;
        
        return true;        
    }

    function requestPayout(bytes32 identifier)
        public 
        returns(bool success) {
        
        BinaryOption storage option = binaryOptions[identifier];

        // Option must exist
        require(option.expiryBlock > 0);

        Prediction storage prediction = predictions[msg.sender][identifier];
        
        // Prediction must exist
        require(prediction.amount > 0);

        // Don't pay out twice
        require(!prediction.paidOut);
        
        // If the outcome has not been resolved, require that the option has expired
        if(!option.resolved) {
            require(option.expiryBlock > block.number);
        }
        
        uint totalBalance = option.totalBalance;
        uint outcomeBalance = getOutcomeBalance(identifier, prediction.predictedOutcome);

        // Scaling factor of the outcome pool to the total balance
        uint r = 1;

        if (option.outcome != Outcome.Undecided) {
            // If the outcome was not undecided, they must have predicted the correct outcome
            require(prediction.predictedOutcome == option.outcome);
            
            r = totalBalance / outcomeBalance;
        }
        
        uint payoutAmount = r * prediction.amount;

        prediction.paidOut = true;
        option.totalBalance -= payoutAmount;
        msg.sender.transfer(payoutAmount);
        
        return true;
    }

    function kill() isOwner() public {
        selfdestruct(owner);
    }

    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier isValidOutcome(Outcome outcome) {
        require(outcome == Outcome.Yes || outcome == Outcome.No);
        _;
    }
}