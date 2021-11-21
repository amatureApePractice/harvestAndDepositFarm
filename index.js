require('dotenv').config();
const Web3 = require('web3');

//WEB3 Config
const web3 = new Web3(process.env.RPC_URL)
const wallet = web3.eth.accounts.wallet.add(process.env.PRIVATE_KEY)

//SMART CONTRACT ABIs
const TOKEN_FARM_ABI;
const TOKEN_POOL_ABI;

//SMART CONTRACT ADDRESSES
const TOKEN_FARM_CONTRACT;
const TOKEN_POOL_CONTRACT;

//smart contract objects
const tokenFarmContract = new web3.eth.Contract(TOKEN_FARM_ABI, TOKEN_FARM_CONTRACT);
const tokenPoolContract = new web3.eth.Contract(TOKEN_POOL_ABI, TOKEN_POOL_CONTRACT);

const farmID = 10;

let currently_compounding = false

async function checkCompoundingOpportunities() {
  if (currently_compounding) return
  try {
    const pendingRewards = await tokenFarmContract.methods.pendingRewards(farmID, wallet.address).call();
    const gasLimit = 200000;
    const gasPrice = await web3.eth.getGasPrice();
    const txCost = web3.utils.fromWei(gasPrice.toString(), 'ether') * gasLimit;

    //if the rewards to be harvested are worth more than the transaction cost
    if (pendingRewards > 5 * txCost) {
      console.log(`Time to compound ${web3.utils.fromWei(pendingRewards.toString(), 'ether')} of your rewards`);
      currently_compounding = true;
      console.log(`gas pice: ${gasPrice}`);
      compound(pendingRewards, tokenPoolContract, gasPrice, gasLimit)
    }
    else {
      console.log(`not ready to compound ${web3.utils.fromWei(pendingRewards.toString(), 'ether')} DINO`)
    }
  } catch (err) {
    console.log(`didn't fetch pendingRewards ${err}`);
    return
  }
}

async function compound(pendingRewards, poolContract, gasPrice, gasLimit) {
  console.log('begin compounding');

  //Withdraw rewards from Farm
  try {
    const withdrawTx = await tokenFarmContract.methods.deposit(farmID, 0).send({
      from: wallet.address,
      gas: gasLimit,
      gasPrice: gasPrice
    });
    console.log(`Withdraw status: ${withdrawTx.status}`)
  } catch (err) {
    currently_compounding = false;
    console.log(`Withdraw Rewards error ${err.message}`);
    return
  }

  try {
    //Deposit Rewards into Pool
    const depositTx = await poolContract.methods.deposit(pendingRewards).send({
      from: wallet.address,
      gas: gasLimit,
      gasPrice: gasPrice
    });
    console.log(`deposit status: ${depositTx.status}`)
  } catch (err) {
    currently_compounding = false;
    console.log(`Deposit Rewards error ${err.message}`);
    return
  }

  currently_compounding = false;
}

checkCompoundingOpportunities();
const POLLING_INTERVAL = 2400000 // 40 minutes
setInterval(async () => { await checkCompoundingOpportunities() }, POLLING_INTERVAL);