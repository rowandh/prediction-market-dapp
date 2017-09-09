pragma solidity ^0.4.2;

contract PredictionMarket {

    address public owner;

    struct BinaryOption {
        string description;
        uint expiryBlock;
        bool resolved;
        Outcome outcome;
        mapping(uint8 => uint) balances; // Outcome => balance
    }

    struct Prediction {
        uint amount;
        Outcome predictedOutcome;
    }

    mapping(bytes32 => BinaryOption) public binaryOptions;

    mapping(address => mapping(bytes32 => Prediction)) public predictions;

    enum Outcome { Unresolved, Yes, No, Undecided }

    function PredictionMarket() {
        owner = msg.sender;
    }

    function addBinaryOption(bytes32 identifier, string description, uint durationInBlocks)
        isOwner()
        public returns(bool success) {
                
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

    function predict(bytes32 identifier, Outcome outcome) payable returns(bool success) {

        // Must back your prediction
        require(msg.value > 0);

        // Require that the option has not expired
        //require(binaryOptions[identifier].expiryBlock >= block.number);

        // Don't allow duplicate bets
        require(predictions[msg.sender][identifier].amount == 0);

        // Only accept predictions for yes and no outcomes
        require(outcome == Outcome.Yes || outcome == Outcome.No);

        BinaryOption option = binaryOptions[identifier];

        option.balances[uint8(outcome)] += msg.value;

        Prediction memory prediction;
        prediction.amount = msg.value;
        prediction.predictedOutcome = outcome;
        predictions[msg.sender][identifier] = prediction;

        return true;
    }

    function resolveBinaryOption(bytes32 identifier, Outcome outcome) 
        isOwner()
        public 
        returns(bool success) {

        BinaryOption memory option = binaryOptions[identifier];
        option.resolved = true;
        option.outcome = outcome;
        
        return true;
    }

    function requestPayout() {

        // If the outcome has not been resolved, require that the option has expired
        // if() {
        //     require(binaryOptions[identifier].expiryBlock > block.number);
        // }
    }

    function kill() {
        require (msg.sender == owner);

        selfdestruct(owner);
    }

    modifier isOwner() {
        require(msg.sender == owner);
        _;
    }
}