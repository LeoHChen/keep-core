import React, { useContext, useCallback } from 'react'
import { SubmitButton } from './Button'
import { Web3Context } from './WithWeb3Context'
import { useShowMessage, messageType } from './Message'

const RecoverStakeButton = ({ operatorAddress, ...props }) => {
  const { yourAddress, stakingContract } = useContext(Web3Context)
  const showMessage = useShowMessage()

  const recoverStake = useCallback(async (onTransactionHashCallback) => {
    try {
      await stakingContract
        .methods
        .recoverStake(operatorAddress)
        .send({ from: yourAddress })
        .on('transactionHash', onTransactionHashCallback)
      showMessage({ type: messageType.SUCCESS, title: 'Success', content: 'Recover stake transaction successfully completed' })
      props.successCallback()
    } catch (error) {
      showMessage({ type: messageType.ERROR, title: 'Recover stake action has been failed ', content: error.message })
    }
  }, [operatorAddress, yourAddress])

  return (
    <SubmitButton
      className={props.btnClassName}
      onSubmitAction={recoverStake}
      pendingMessageTitle='Recover stake transaction is pending...'
    >
      {props.btnText}
    </SubmitButton>
  )
}

RecoverStakeButton.defaultProps = {
  btnClassName: 'btn btn-sm btn-default',
  btnText: 'recover',
  successCallback: () => {},
}

export default React.memo(RecoverStakeButton)
