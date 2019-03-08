package resultsubmission

import (
	"crypto/ecdsa"

	relayChain "github.com/keep-network/keep-core/pkg/beacon/relay/chain"
	"github.com/keep-network/keep-core/pkg/chain"
)

// ParticipantIndex is an index of a participant in the group.
// Indexing starts with `1`.
type ParticipantIndex uint32

// ResultSigningMember represents a member sharing preferred DKG result hash
// and signature over this hash with peer members.
type ResultSigningMember struct {
	index ParticipantIndex

	chainHandle chain.Handle

	// Hash of DKG result preferred by the current participant.
	dkgResultHash relayChain.DKGResultHash

	// Keys used for signing the DKG result hash.
	privateKey     ecdsa.PrivateKey
	peerPublicKeys map[ParticipantIndex]ecdsa.PublicKey

	// Received valid signatures supporting the same DKG result as current's
	// participants prefer. Contains also current's participant's signature.
	validResultSignatures map[ParticipantIndex]Signature // TODO: Rename: receivedValidResultSignatures
}
