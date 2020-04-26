/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-plusplus */
/* eslint-disable react/prop-types */
// @flow
import React, { Component } from 'react';
import {
  AccordionItemButton,
  AccordionItem,
  AccordionItemHeading,
  AccordionItemPanel,
  Accordion
} from 'react-accessible-accordion';
import styles from './Dashboard.module.css';
import cstyles from './Common.module.css';
import { TotalBalance, Info, AddressBalance } from './AppState';
import Utils from '../utils/utils';
import ScrollPane from './ScrollPane';

// $FlowFixMe
export const BalanceBlockHighlight = ({ blvValue, usdValue, currencyName }) => {
  const { bigPart, smallPart } = Utils.splitBlvAmountIntoBigSmall(blvValue);

  return (
    <div style={{ padding: '1em' }}>
      <div className={[cstyles.highlight, cstyles.xlarge].join(' ')}>
        <span>
          {currencyName} {bigPart}
        </span>
        <span className={[cstyles.small, cstyles.blvsmallpart].join(' ')}>{smallPart}</span>
      </div>
      <div className={[cstyles.sublight, cstyles.small].join(' ')}>{usdValue}</div>
    </div>
  );
};

// eslint-disable-next-line react/prop-types
const BalanceBlock = ({ blvValue, usdValue, topLabel, currencyName }) => {
  const { bigPart, smallPart } = Utils.splitBlvAmountIntoBigSmall(blvValue);

  return (
    <div className={cstyles.padall}>
      <div className={[styles.sublight, styles.small].join(' ')}>{topLabel}</div>
      <div className={[cstyles.highlight, cstyles.large].join(' ')}>
        <span>
          {currencyName} {bigPart}
        </span>
        <span className={[cstyles.small, cstyles.blvsmallpart].join(' ')}>{smallPart}</span>
      </div>
      <div className={[cstyles.sublight, cstyles.small].join(' ')}>{usdValue}</div>
    </div>
  );
};

const AddressBalanceItem = ({ currencyName, blvPrice, item }) => {
  const { bigPart, smallPart } = Utils.splitBlvAmountIntoBigSmall(Math.abs(item.balance));

  return (
    <AccordionItem key={item.label} className={[cstyles.well, cstyles.margintopsmall].join(' ')} uuid={item.address}>
      <AccordionItemHeading>
        <AccordionItemButton className={cstyles.accordionHeader}>
          <div className={[cstyles.flexspacebetween].join(' ')}>
            <div>{Utils.splitStringIntoChunks(item.address, 6).join(' ')}</div>
            <div className={[styles.txamount, cstyles.right].join(' ')}>
              <div>
                <span>
                  {currencyName} {bigPart}
                </span>
                <span className={[cstyles.small, cstyles.blvsmallpart].join(' ')}>{smallPart}</span>
              </div>
              <div className={[cstyles.sublight, cstyles.small, cstyles.padtopsmall].join(' ')}>
                {Utils.getBlvToUsdString(blvPrice, Math.abs(item.balance))}
              </div>
            </div>
          </div>
        </AccordionItemButton>
      </AccordionItemHeading>
      <AccordionItemPanel />
    </AccordionItem>
  );
};

type Props = {
  totalBalance: TotalBalance,
  info: Info,
  addressesWithBalance: AddressBalance[]
};

export default class Home extends Component<Props> {
  render() {
    const { totalBalance, info, addressesWithBalance } = this.props;

    return (
      <div>
        <div className={[cstyles.well, styles.balancebox].join(' ')}>
          <BalanceBlockHighlight
            blvValue={totalBalance.total}
            usdValue={Utils.getBlvToUsdString(info.blvPrice, totalBalance.total)}
            currencyName={info.currencyName}
          />
          <BalanceBlock
            topLabel="Shielded"
            blvValue={totalBalance.private}
            usdValue={Utils.getBlvToUsdString(info.blvPrice, totalBalance.private)}
            currencyName={info.currencyName}
          />
          <BalanceBlock
            topLabel="Transparent"
            blvValue={totalBalance.transparent}
            usdValue={Utils.getBlvToUsdString(info.blvPrice, totalBalance.transparent)}
            currencyName={info.currencyName}
          />
        </div>

        <div className={styles.addressbalancecontainer}>
          <ScrollPane offsetHeight={200}>
            <div className={styles.addressbooklist}>
              <div className={[cstyles.flexspacebetween, cstyles.tableheader, cstyles.sublight].join(' ')}>
                <div>Address</div>
                <div>Balance</div>
              </div>
              {addressesWithBalance &&
                (addressesWithBalance.length === 0 ? (
                  <div className={[cstyles.center, cstyles.sublight].join(' ')}>No Addresses with a balance</div>
                ) : (
                  <Accordion>
                    {addressesWithBalance
                      .filter(ab => ab.balance > 0)
                      .map(ab => (
                        <AddressBalanceItem
                          key={ab.address}
                          item={ab}
                          currencyName={info.currencyName}
                          blvPrice={info.blvPrice}
                        />
                      ))}
                  </Accordion>
                ))}
            </div>
          </ScrollPane>
        </div>
      </div>
    );
  }
}
