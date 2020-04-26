BlvWallet is a z-Addr first, Sapling compatible wallet and full node for bitcoinloved that runs on Linux, Windows and macOS.

![Screenshot](resources/screenshot1.png?raw=true)
![Screenshots](resources/screenshot2.png?raw=true)

# Installation

Head over to the releases page and grab the latest installers or binary. https://github.com/BitcoinloveFoundation/blvwallet/releases

### Linux

If you are on Debian/Ubuntu, please download the '.AppImage' package and just run it.

```
./Blvwallet.Fullnode-0.9.9.AppImage
```

If you prefer to install a `.deb` package, that is also available.

```
sudo dpkg -i blvwallet_0.9.9_amd64.deb
sudo apt install -f
```

### Windows

Download and run the `.msi` installer and follow the prompts. Alternately, you can download the release binary, unzip it and double click on `blvwallet.exe` to start.

### macOS

Double-click on the `.dmg` file to open it, and drag `Blvwallet Fullnode` on to the Applications link to install.

## bitcoinloved

BlvWallet needs a Bitcoinlove node running bitcoinloved. If you already have a bitcoinloved node running, BlvWallet will connect to it.

If you don't have one, BlvWallet will start its embedded bitcoinloved node.

Additionally, if this is the first time you're running BlvWallet or a bitcoinloved daemon, BlvWallet will download the Bitcoinlove params (~777 MB) and configure `bitcoinlove.conf` for you.

## Compiling from source

BlvWallet is written in Electron/Javascript and can be build from source. Note that if you are compiling from source, you won't get the embedded bitcoinloved by default. You can either run an external bitcoinloved, or compile bitcoinloved as well.

#### Pre-Requisits

You need to have the following software installed before you can build Blvwallet Fullnode

- Nodejs v12.16.1 or higher - https://nodejs.org
- Yarn - https://yarnpkg.com

```
git clone https://github.com/BitcoinloveFoundation/blvwallet.git
cd blvwallet

yarn install
yarn build
```

To start in development mode, run

```
yarn dev
```

To start in production mode, run

```
yarn start
```

### [Troubleshooting Guide & FAQ](https://github.com/BitcoinloveFoundation/blvwallet/wiki/Troubleshooting-&-FAQ)

Please read the [troubleshooting guide](https://docs.blvwallet.co/troubleshooting/) for common problems and solutions.
For support or other questions, tweet at [@blvwallet](https://twitter.com/blvwallet) or [file an issue](https://github.com/BitcoinloveFoundation/blvwallet/issues).

_PS: BlvWallet is NOT an official wallet, and is not affiliated with the Electric Coin Company in any way._
