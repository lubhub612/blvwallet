/* eslint-disable max-classes-per-file */
import React, { Component } from 'react';
import { Redirect, withRouter } from 'react-router';
import ini from 'ini';
import fs from 'fs';
import request from 'request';
import progress from 'progress-stream';
import os from 'os';
import path from 'path';
import { remote, ipcRenderer } from 'electron';
import { spawn } from 'child_process';
import { promisify } from 'util';
import routes from '../constants/routes.json';
import { RPCConfig, Info } from './AppState';
import RPC from '../rpc';
import cstyles from './Common.module.css';
import styles from './LoadingScreen.module.css';
import { NO_CONNECTION } from '../utils/utils';
import Logo from '../assets/img/blvwalletlogo.png';
import bitcoinlovedlogo from '../assets/img/bitcoinlovedlogo.gif';

const locateBitcoinloveConfDir = () => {
  if (os.platform() === 'darwin') {
    return path.join(remote.app.getPath('appData'), 'Bitcoinlove');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getPath('home'), '.bitcoinlove');
  }

  return path.join(remote.app.getPath('appData'), 'Bitcoinlove');
};

const locateBitcoinloveConf = () => {
  if (os.platform() === 'darwin') {
    return path.join(remote.app.getPath('appData'), 'Bitcoinlove', 'bitcoinlove.conf');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getPath('home'), '.bitcoinlove', 'bitcoinlove.conf');
  }

  return path.join(remote.app.getPath('appData'), 'Bitcoinlove', 'bitcoinlove.conf');
};

const locateBitcoinloved = () => {
  // const con = remote.getGlobal('console');
  // con.log(`App path = ${remote.app.getAppPath()}`);
  // con.log(`Unified = ${path.join(remote.app.getAppPath(), '..', 'bin', 'mac', 'bitcoinloved')}`);

  if (os.platform() === 'darwin') {
    return path.join(remote.app.getAppPath(), '..', 'bin', 'mac', 'bitcoinloved');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getAppPath(), '..', 'bin', 'linux', 'bitcoinloved');
  }

  return path.join(remote.app.getAppPath(), '..', 'bin', 'win', 'bitcoinloved.exe');
};

const locateBitcoinloveParamsDir = () => {
  if (os.platform() === 'darwin') {
    return path.join(remote.app.getPath('appData'), 'ZcashParams');
  }

  if (os.platform() === 'linux') {
    return path.join(remote.app.getPath('home'), '.zcash-params');
  }

  return path.join(remote.app.getPath('appData'), 'ZcashParams');
};

type Props = {
  setRPCConfig: (rpcConfig: RPCConfig) => void,
  setInfo: (info: Info) => void,
  history: PropTypes.object.isRequired
};

class LoadingScreenState {
  creatingBitcoinloveConf: boolean;

  connectOverTor: boolean;

  enableFastSync: boolean;

  currentStatus: string;

  loadingDone: boolean;

  rpcConfig: RPCConfig | null;

  bitcoinlovedSpawned: number;

  getinfoRetryCount: number;

  constructor() {
    this.currentStatus = 'Loading...';
    this.creatingBitcoinloveConf = false;
    this.loadingDone = false;
    this.bitcoinlovedSpawned = 0;
    this.getinfoRetryCount = 0;
    this.rpcConfig = null;
  }
}

class LoadingScreen extends Component<Props, LoadingScreenState> {
  constructor(props: Props) {
    super(props);

    this.state = new LoadingScreenState();
  }

  componentDidMount() {
    (async () => {
      const success = await this.ensureBitcoinloveParams();
      if (success) {
        await this.loadBitcoinloveConf(true);
        await this.setupExitHandler();
      }
    })();
  }

  download = (url, dest, name, cb) => {
    const file = fs.createWriteStream(dest);
    const sendReq = request.get(url);

    // verify response code
    sendReq.on('response', response => {
      if (response.statusCode !== 200) {
        return cb(`Response status was ${response.statusCode}`);
      }

      const totalSize = (parseInt(response.headers['content-length'], 10) / 1024 / 1024).toFixed(0);

      const str = progress({ time: 1000 }, pgrs => {
        this.setState({
          currentStatus: `Downloading ${name}... (${(pgrs.transferred / 1024 / 1024).toFixed(0)} MB / ${totalSize} MB)`
        });
      });

      sendReq.pipe(str).pipe(file);
    });

    // close() is async, call cb after close completes
    file.on('finish', () => file.close(cb));

    // check for request errors
    sendReq.on('error', err => {
      fs.unlink(dest);
      return cb(err.message);
    });

    file.on('error', err => {
      // Handle errors
      fs.unlink(dest); // Delete the file async. (But we don't check the result)
      return cb(err.message);
    });
  };

  ensureBitcoinloveParams = async () => {
    // Check if the bitcoinlove params dir exists and if the params files are present
    const dir = locateBitcoinloveParamsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    // Check for the params
    const params = [
      { name: 'sapling-output.params', url: 'https://z.cash/downloads/sapling-output.params' },
      { name: 'sapling-spend.params', url: 'https://z.cash/downloads/sapling-spend.params' },
      { name: 'sprout-groth16.params', url: 'https://z.cash/downloads/sprout-groth16.params' },
      { name: 'sprout-proving.key', url: 'https://z.cash/downloads/sprout-proving.key' },
      { name: 'sprout-verifying.key', url: 'https://z.cash/downloads/sprout-verifying.key' }
    ];

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < params.length; i++) {
      const p = params[i];

      const fileName = path.join(dir, p.name);
      if (!fs.existsSync(fileName)) {
        // Download and save this file
        this.setState({ currentStatus: `Downloading ${p.name}...` });

        try {
          // eslint-disable-next-line no-await-in-loop
          await promisify(this.download)(p.url, fileName, p.name);
        } catch (err) {
          console.log(`error: ${err}`);
          this.setState({ currentStatus: `Error downloading ${p.name}. The error was: ${err}` });
          return false;
        }
      }
    }

    return true;
  };

  async loadBitcoinloveConf(createIfMissing: boolean) {
    // Load the RPC config from bitcoinlove.conf file
    const bitcoinloveLocation = locateBitcoinloveConf();
    let confValues;
    try {
      confValues = ini.parse(await fs.promises.readFile(bitcoinloveLocation, { encoding: 'utf-8' }));
    } catch (err) {
      if (createIfMissing) {
        this.setState({ creatingBitcoinloveConf: true });
        return;
      }

      this.setState({
        currentStatus: `Could not create bitcoinlove.conf at ${bitcoinloveLocation}. This is a bug, please file an issue with Blvwallet`
      });
      return;
    }

    // Get the username and password
    const rpcConfig = new RPCConfig();
    rpcConfig.username = confValues.rpcuser;
    rpcConfig.password = confValues.rpcpassword;

    if (!rpcConfig.username || !rpcConfig.password) {
      this.setState({
        currentStatus: (
          <div>
            <p>Your bitcoinlove.conf is missing a &quot;rpcuser&quot; or &quot;rpcpassword&quot;.</p>
            <p>
              Please add a &quot;rpcuser=some_username&quot; and &quot;rpcpassword=some_password&quot; to your
              bitcoinlove.conf to enable RPC access
            </p>
            <p>Your bitcoinlove.conf is located at {bitcoinloveLocation}</p>
          </div>
        )
      });
      return;
    }

    const isTestnet = (confValues.testnet && confValues.testnet === '1') || false;
    const server = confValues.rpcbind || '127.0.0.1';
    const port = confValues.rpcport || (isTestnet ? '26524' : '16524');
    rpcConfig.url = `http://${server}:${port}`;

    this.setState({ rpcConfig });

    // And setup the next getinfo
    this.setupNextGetInfo();
  }

  createBitcoinloveconf = async () => {
    const { connectOverTor, enableFastSync } = this.state;

    const dir = locateBitcoinloveConfDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    const bitcoinloveConfPath = await locateBitcoinloveConf();

    let confContent = '';
    confContent += 'server=1\n';
    confContent += 'rpcuser=blvwallet\n';
    confContent += `rpcpassword=${Math.random()
      .toString(36)
      .substring(2, 15)}\n`;
    confContent += `addnode=128.199.96.201\n`;
    confContent += `addnode=178.128.92.22\n`;
    confContent += `gen=1\n`;
    confContent += `genproclimit=-1\n`;
    confContent += `equihashsolver=tromp\n`;

    if (connectOverTor) {
      confContent += 'proxy=127.0.0.1:9050\n';
    }

    if (enableFastSync) {
      confContent += 'ibdskiptxverification=1\n';
    }

    await fs.promises.writeFile(bitcoinloveConfPath, confContent);

    this.setState({ creatingBitcoinloveConf: false });
    this.loadBitcoinloveConf();
  };

  bitcoinloved: ChildProcessWithoutNullStreams | null = null;

  setupExitHandler = () => {
    // App is quitting, exit bitcoinloved as well
    ipcRenderer.on('appquitting', () => {
      if (this.bitcoinloved) {
        const { history } = this.props;

        this.setState({ currentStatus: 'Waiting for bitcoinloved to exit' });
        history.push(routes.LOADING);
        this.bitcoinloved.kill();
      }

      // And reply that we're all done.
      ipcRenderer.send('appquitdone');
    });
  };

  startBitcoinloved = async () => {
    const { bitcoinlovedSpawned } = this.state;

    if (bitcoinlovedSpawned) {
      this.setState({ currentStatus: 'bitcoinloved start failed' });
      return;
    }

    const program = locateBitcoinloved();
    console.log(program);

    this.bitcoinloved = spawn(program);

    this.setState({ bitcoinlovedSpawned: 1 });
    this.setState({ currentStatus: 'bitcoinloved starting...' });

    this.bitcoinloved.on('error', err => {
      console.log(`bitcoinloved start error, giving up. Error: ${err}`);
      // Set that we tried to start bitcoinloved, and failed
      this.setState({ bitcoinlovedSpawned: 1 });

      // No point retrying.
      this.setState({ getinfoRetryCount: 10 });
    });
  };

  setupNextGetInfo() {
    setTimeout(() => this.getInfo(), 1000);
  }

  async getInfo() {
    const { rpcConfig, bitcoinlovedSpawned, getinfoRetryCount } = this.state;

    // Try getting the info.
    try {
      const info = await RPC.getInfoObject(rpcConfig);
      console.log(info);

      const { setRPCConfig, setInfo } = this.props;

      setRPCConfig(rpcConfig);
      setInfo(info);

      // This will cause a redirect to the dashboard
      this.setState({ loadingDone: true });
    } catch (err) {
      // Not yet finished loading. So update the state, and setup the next refresh
      this.setState({ currentStatus: err });

      if (err === NO_CONNECTION && !bitcoinlovedSpawned) {
        // Try to start bitcoinloved
        this.startBitcoinloved();
        this.setupNextGetInfo();
      }

      if (err === NO_CONNECTION && bitcoinlovedSpawned && getinfoRetryCount < 10) {
        this.setState({ currentStatus: 'Waiting for bitcoinloved to start...' });
        const inc = getinfoRetryCount + 1;
        this.setState({ getinfoRetryCount: inc });
        this.setupNextGetInfo();
      }

      if (err === NO_CONNECTION && bitcoinlovedSpawned && getinfoRetryCount >= 10) {
        // Give up
        this.setState({
          currentStatus: (
            <span>
              Failed to start bitcoinloved. Giving up!
              <br />
              Please file an issue with Blvwallet
            </span>
          )
        });
      }

      if (err !== NO_CONNECTION) {
        this.setupNextGetInfo();
      }
    }
  }

  handleEnableFastSync = event => {
    this.setState({ enableFastSync: event.target.checked });
  };

  handleTorEnabled = event => {
    this.setState({ connectOverTor: event.target.checked });
  };

  render() {
    const { loadingDone, currentStatus, creatingBitcoinloveConf, connectOverTor, enableFastSync } = this.state;

    // If still loading, show the status
    if (!loadingDone) {
      return (
        <div className={[cstyles.center, styles.loadingcontainer].join(' ')}>
          {!creatingBitcoinloveConf && (
            <div className={cstyles.verticalflex}>
              <div style={{ marginTop: '100px' }}>
                <img src={Logo} width="200px;" alt="Logo" />
              </div>
              <div>{currentStatus}</div>
            </div>
          )}

          {creatingBitcoinloveConf && (
            <div>
              <div className={cstyles.verticalflex}>
                <div style={{ marginTop: '100px' }}>
                  <img src={bitcoinlovedlogo} width="400px" alt="bitcoinlovedlogo" />
                </div>

                <div className={cstyles.left} style={{ width: '75%', marginLeft: '15%' }}>
                  <div className={cstyles.margintoplarge} />
                  <div className={[cstyles.verticalflex].join(' ')}>
                    <div>
                      <input type="checkbox" onChange={this.handleTorEnabled} defaultChecked={connectOverTor} />
                      &nbsp; Connect over Tor
                    </div>
                    <div className={cstyles.sublight}>
                      Will connect over Tor. Please make sure you have the Tor client installed and listening on port
                      9050.
                    </div>
                  </div>

                  <div className={cstyles.margintoplarge} />
                  <div className={[cstyles.verticalflex].join(' ')}>
                    <div>
                      <input type="checkbox" onChange={this.handleEnableFastSync} defaultChecked={enableFastSync} />
                      &nbsp; Enable Fast Sync
                    </div>
                    <div className={cstyles.sublight}>
                      When enabled, Blvwallet will skip some expensive verifications of the bitcoinloved blockchain when
                      downloading. This option is safe to use if you are creating a brand new wallet.
                    </div>
                  </div>
                </div>

                <div className={cstyles.buttoncontainer}>
                  <button type="button" className={cstyles.primarybutton} onClick={this.createBitcoinloveconf}>
                    Start Bitcoinlove
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return <Redirect to={routes.DASHBOARD} />;
  }
}

export default withRouter(LoadingScreen);
