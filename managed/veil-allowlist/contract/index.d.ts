import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum PolicyState { ACTIVE = 0, PAUSED = 1 }

export type Witnesses<PS> = {
  private_admin_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  private_credential_commitment(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  private_membership_path(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { leaf: Uint8Array,
                                                                                        path: { sibling: { field: bigint
                                                                                                         },
                                                                                                goes_left: boolean
                                                                                              }[]
                                                                                      }];
  private_nullifier_secret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  rotate_policy(context: __compactRuntime.CircuitContext<PS>,
                new_allowlist_root_0: bigint,
                new_max_passes_0: bigint,
                new_valid_until_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_policy(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_policy(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transfer_admin(context: __compactRuntime.CircuitContext<PS>,
                 new_admin_secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  prove_access(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  revoke_pass(context: __compactRuntime.CircuitContext<PS>,
              pass_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  validate_pass(context: __compactRuntime.CircuitContext<PS>,
                pass_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  rotate_policy(context: __compactRuntime.CircuitContext<PS>,
                new_allowlist_root_0: bigint,
                new_max_passes_0: bigint,
                new_valid_until_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_policy(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_policy(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transfer_admin(context: __compactRuntime.CircuitContext<PS>,
                 new_admin_secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  prove_access(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  revoke_pass(context: __compactRuntime.CircuitContext<PS>,
              pass_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  validate_pass(context: __compactRuntime.CircuitContext<PS>,
                pass_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  derive_admin_key(secret_0: Uint8Array): Uint8Array;
  derive_nullifier(root_0: bigint, epoch_0: bigint, secret_0: Uint8Array): Uint8Array;
  derive_pass_id(root_0: bigint, epoch_0: bigint, nullifier_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  derive_admin_key(context: __compactRuntime.CircuitContext<PS>,
                   secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  derive_nullifier(context: __compactRuntime.CircuitContext<PS>,
                   root_0: bigint,
                   epoch_0: bigint,
                   secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  derive_pass_id(context: __compactRuntime.CircuitContext<PS>,
                 root_0: bigint,
                 epoch_0: bigint,
                 nullifier_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  rotate_policy(context: __compactRuntime.CircuitContext<PS>,
                new_allowlist_root_0: bigint,
                new_max_passes_0: bigint,
                new_valid_until_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  pause_policy(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  resume_policy(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  transfer_admin(context: __compactRuntime.CircuitContext<PS>,
                 new_admin_secret_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  prove_access(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
  revoke_pass(context: __compactRuntime.CircuitContext<PS>,
              pass_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  validate_pass(context: __compactRuntime.CircuitContext<PS>,
                pass_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  readonly admin_key: Uint8Array;
  readonly allowlist_root: bigint;
  readonly policy_state: PolicyState;
  readonly policy_epoch: bigint;
  readonly max_passes: bigint;
  readonly valid_until: bigint;
  readonly verified_passes: bigint;
  used_nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  issued_passes: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  revoked_passes: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               initial_admin_secret_0: Uint8Array,
               initial_allowlist_root_0: bigint,
               initial_max_passes_0: bigint,
               initial_valid_until_0: bigint): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
