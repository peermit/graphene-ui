var alt = require("../alt-instance");
import WalletUnlockActions from "actions/WalletUnlockActions"
import WalletDb from "stores/WalletDb"
import {Aes, FetchChain, TransactionHelper} from "graphenejs-lib";
import PrivateKeyStore from "stores/PrivateKeyStore";
import SettingsStore from "stores/SettingsStore";

let chain = SettingsStore.getState().settings.get("unit").toLowerCase()
let peermitSettings = null;

switch(chain) {
    case "test":
        peermitSettings = {
            name : "Peermit",
            account_id : "1.2.346",
            api_url : "https://api.peermit.com/v1/" + chain,
            memo_account : "peermit-reg",
        }
        break;
    case "bts":
        peermitSettings = {
            name : "Peermit",
            account_id : "1.2.99149",
            api_url : "https://api.peermit.com/v1/" + chain,
            memo_account : "peermit-reg",
        }
        break;
    case "core":
        peermitSettings = {
            name : "Peermit",
            account_id : "1.2.19",
            api_url : "http://localhost:8081/v1/" + chain,
            memo_account : "peermit-reg",
        }
        break;
    default:
        console.log("Sorry, this chain is not supported by Peermit, yet!");
        break;
}


class PeermitActions {

    unlock(e) {
        return WalletUnlockActions.unlock();
    }

    getProvider() {
        return peermitSettings;
    }

    setSetting(key, value) {
        this.dispatch({key: key,
                       value: value});
    }

    removeSetting(key) {
        this.dispatch(key);
    }

    encrytSettings(settings, account_owner) {
        let message = JSON.stringify(settings);
        let peermitAccountPromise = FetchChain("getAccount", peermitSettings.memo_account);
        var unlock_promise = WalletUnlockActions.unlock()
        return Promise.all([peermitAccountPromise, unlock_promise]).then((res) => {
            let memo_to_public = res[0].getIn(["options","memo_key"]);
            let memo_from_privkey = WalletDb.getPrivateKey(account_owner);
            if (!memo_from_privkey) {
                //return Promise.reject("Account Owner key is required!");
                throw new Error("Account Owner key is required!");
            }
            var nonce = TransactionHelper.unique_nonce_uint64();
            let memo_object = {
                from: account_owner,
                to: memo_to_public,
                nonce,
                message: Aes.encrypt_with_checksum(
                        memo_from_privkey,
                        memo_to_public,
                        nonce,
                        Buffer.isBuffer(message) ? message.toString("utf-8") : message
                    ).toString('hex')
                }
            return Promise.resolve(memo_object);
        });
    }

    submitSettings(encrypted_body, accountName) {
        console.log(JSON.stringify(encrypted_body));
        return fetch( peermitSettings.api_url + '/account/' + accountName + '/register', {
            method:'post',
            headers: new Headers( { "Accept": "application/json", "Content-Type":"application/json" } ),
            body: JSON.stringify(encrypted_body)
        }).then( reply => {
            return reply.json().then( json => {
                if (json.status === "success") {
                    this.dispatch({submit_success: json.data});
                    return Promise.resolve();
                } else {
                    throw new Error(json.data);
                }
            }).catch(error => {
                throw error;
            }
        )
        }).catch(error => {
            throw error;
        });
    }

    loadAccount(accountName) {
        return fetch( peermitSettings.api_url + '/account/' + accountName + '/info', {
            method:'get',
            headers: new Headers({"Accept": "application/json",
                                  "Content-Type":"application/json"}),
        }).then( reply => {
                // 404 is returned if the account is not found
                if (reply.status == 404) {
                    return reply.json().then( json => {
                            if(json.status == "error"){
                                this.dispatch({error: json.data});
                                return Promise.resolve();
                            }
                            throw new Error("API Server down");
                        }).catch(error => {
                            throw new Error("An error occured while loading your account!");
                        })
                } else {
                    return reply.json().then( json => {
                        if (json.status === "success") {
                            let {text, isMine} = PrivateKeyStore.decodeMemo(json.settings);
                            this.dispatch({error: null,
                                           settings: JSON.parse(text),
                                           isMine: isMine,
                            });
                            return Promise.resolve();
                        } else if (json.status === "error") {
                            throw new Error(json.data);
                        } else {
                            throw new Error("A error occured while decoding the servers message");
                        }
                }).catch(error => {
                    throw error;
                })
                }
        }).catch(error => {
            throw error;
        });
    }

}

module.exports = alt.createActions(PeermitActions);
