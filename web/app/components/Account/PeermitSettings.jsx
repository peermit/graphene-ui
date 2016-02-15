import React from "react";
import Translate from "react-translate-component";
import Icon from "../Icon/Icon";
import LoadingIndicator from "../LoadingIndicator";
import AccountSelector from "./AccountSelector";
import PeermitActions from "actions/PeermitActions";
import AltContainer from "alt-container";
import {FetchChain} from "graphenejs-lib";
import counterpart from "counterpart";
import notify from "actions/NotificationActions";
import cname from "classnames"


/**
 * @brief Allows user to set a second factor service
 */

class PeermitSettingsTable extends React.Component {

    constructor(props) {
        super(props)
    }

    componentDidMount() {
        this.checkRequiredSettings();
    }

    checkRequiredSettings() {
        if ("mail" in this.props.settings) {
            this.props.onSuccess();
        }
    }

    _toggleLock(e) {
        e.preventDefault();
        PeermitActions.unlock().then(() => {
            PeermitActions.loadAccount(this.props.accountName)
            .then(() => {
                this.checkRequiredSettings();
            })
            .catch(error => {
                notify.error("" + error);
            });
        });
    }

    onRemoveSettingItem(key, e) {
        e.preventDefault();
        PeermitActions.removeSetting(key);
    }

    render() {
        let mySettings = null;
        if (!this.props.account_loaded) {
            return <span>Loading settings from Peermit <LoadingIndicator type="circle"/></span>;
        } else {
            if (this.props.isMine && !this.props.error) {
                 return (
                    <div className="memo">
                        <Translate content="account.perm.secure_account.require_unlock" />
                        <a href onClick={this._toggleLock.bind(this)}>
                            <Icon name="locked"/>
                        </a>
                    </div>
                );
            } else {
                let settingOptions = []
                let settings = this.props.settings;
                if (Object.keys(settings).length > 0) {
                    for (let key in settings) {
                        settingOptions.push(
                            <tr key={key}>
                                <td><Translate content={`account.perm.secure_account.settings.${key}`} /></td>
                                <td>{settings[key]}</td>
                                <td><button className="button" onClick={this.onRemoveSettingItem.bind(this, key)}>-</button></td>
                            </tr>
                        )
                    }
                    return (
                        <div className="recent-transactions no-overflow">
                            <div className="generic-bordered-box">
                                <table className="table compact">
                                    <thead>
                                     <tr>
                                      <th>Setting</th>
                                      <th>Value</th>
                                      <th>Action</th>
                                     </tr>
                                    </thead>
                                    <tbody>
                                     {settingOptions}
                                    </tbody>
                                </table>
                            </div>
                            <PeermitSettingsForm {...this.props} />
                        </div>
                    )
                } else {
                    return (
                        <div>
                            <Translate content="account.perm.secure_account.no_settings" />
                            <PeermitSettingsForm {...this.props} />
                        </div>
                    );
                }
            }
        }
    }
}

class PeermitSettingsForm extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            currentModifyingSetting: null,
            settingValue: null,
            accepted_terms: false,
        };
    }

    componentDidMount() {
        this.checkRequiredSettings();
    }

    checkRequiredSettings() {
        if ("mail" in this.props.settings) {
            this.props.onSuccess();
        }
    }

    onAddSettingItem(e) {
        e.preventDefault();
        if (this.state.currentModifyingSetting) {
            PeermitActions.setSetting(this.state.currentModifyingSetting, this.state.settingValue);
        }
    }

    onChangeSettingItem(e) {
        e.preventDefault();
        this.setState({currentModifyingSetting: e.target.value});
    }

    onChangeSettingValue(e) {
        e.preventDefault();
        this.setState({ settingValue : e.target.value });
    }

    onSubmitSettings(e) {
        console.log("encrypting data for Peermit");
        e.preventDefault();
        PeermitActions.encrytSettings(this.props.settings, this.props.owner_keys.toArray()[0]).then((encrypted_body) => {
            console.log("submitting encrypted data to Peermit");
            PeermitActions.submitSettings(encrypted_body, this.props.accountName)
            .then(msg => {
                notify.success("Successfully updated your settings")
                this.checkRequiredSettings();
            })
            .catch(error => {
                notify.error("" + error);
            });
        });

    }

    toggleTerms(e) {
        this.setState({accepted_terms: !this.state.accepted_terms});
    }

    render() {
        return (
            <form>
                <div class="grid-block">
                    <div class="small-12 medium-6 grid-content">
                        <span className="inline-label">
                            <select value={this.state.currentModifyingSetting} onChange={this.onChangeSettingItem.bind(this)}>
                                <option />
                                {["mail"].map((key) => {
                                    return (
                                         <option key={key} value={key}>{counterpart.translate(`account.perm.secure_account.settings.${key}`)}</option>
                                    );
                                })}

                            </select>
                            <input className="small"
                                   type="text"
                                   required
                                   value={this.state.settingValue}
                                   tabIndex="4"
                                   onChange={this.onChangeSettingValue.bind(this)}
                                   autoComplete="off"
                                   style={{width: "80%"}} />
                            <button className="button" onClick={this.onAddSettingItem.bind(this)} >+</button>
                        </span>
                    </div>
                </div>
                <div class="grid-block">
                    <div className="small-12 medium-6 grid-content">
                        <input id="terms"
                               type="checkbox"
                               onChange={this.toggleTerms.bind(this)}
                               checked={this.state.accepted_terms} />
                        <label for="checkbox1">
                           <a href="http://peermit.com/terms/" target="_blank">
                             <Translate content="account.perm.secure_account.terms" />
                           </a>
                        </label>
                    </div>
                    <div className="small-12 medium-6 grid-content">
                        <button className="button"
                            onClick={this.onSubmitSettings.bind(this)}
                            disabled={!this.state.accepted_terms}
                            className={cname("button", (this.state.accepted_terms) ? "" : "disabled")}>
                           <Translate content="account.perm.secure_account.register_btn" />
                        </button>
                    </div>
                </div>
            </form>
        );
    }
}

class ReferenceAccount extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            item_name_input: null,
            success: false,
            error: null,
            reference_account_name : "",
        };
    }

    componentWillMount() {
        this.getReferenceAccount();
    }

    componentDidMount() {
        this.checkRequiredSettings();
    }

    checkRequiredSettings() {
        if (this.state.reference_account_name) {
            this.props.onSuccess();
        }
    }

    getReferenceAccount() {
        let account_id = this.props.accounts.filter(i => {
            if (!i) return false;
            if (i == this.props.provider.account_id) return false;
            return true;
        }).toArray();

        if(account_id) {
            FetchChain("getAccount", account_id[0]).then(a => {
                this.setState({
                    reference_account_name: a[0].get("name"),
                    item_name_input: a[0].get("name"),
                });
                this.checkRequiredSettings();
            });
        }
    }

    onItemAccountChange(reference_account_name) {
        this.setState({reference_account_name, error: null});
    }

    onItemChange(item_name_input) {
        this.setState({item_name_input});
    }

    onAddAccountItem(item) {
        if(!item) return;
        let next_state = {
            success: true,
        };
        this.setState(next_state);
        let item_value = typeof(item) === "string" ? item : item.get("id");
        this.props.onAddItem(item_value, 1);
        this.checkRequiredSettings();
    }

    render() {
        let success = this.state.success ? <span>Successfully added reference account!<br/> Do not forget to publish the changes to your account!</span> : null;
        let placeholder = <Translate content="account.perm.secure_account.reference_account" />
        return (<div>
                   <AccountSelector label="account.perm.secure_account.reference_account"
                           error={this.state.error}
                           placeholder=""
                           account={this.state.item_name_input}
                           accountName={this.state.item_name_input}
                           onChange={this.onItemChange.bind(this)}
                           onAccountChanged={this.onItemAccountChange.bind(this)}
                           onAction={this.onAddAccountItem.bind(this)}
                           action_label="account.votes.add_witness"
                           tabIndex={5}
                           allowPubKey={false}
                           disableActionButton={false} />
                   {success}
                </div>
               );
    }
}


class Enable2FAForm extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            is_secured : this.isAnyProviderEnabled(),
        };
    }

    componentDidMount() {
        this.checkRequiredSettings();
    }

    checkRequiredSettings() {
        if (this.state.is_secured) {
            this.props.onSuccess();
        }
    }

    isAnyProviderEnabled() {
        if (this.props.accounts.indexOf(this.props.provider.account_id) > -1) {
            return true;
        }
        return false;
    }

    onAddProvider() {
        console.log("Adding new active authority and changing threshold!")
        this.props.onAddItem(this.props.provider.account_id, 1);
        this.props.onChangeThreshold(2);
        this.checkRequiredSettings();
    }

    onRemoveProvider() {
        this.props.onRemoveItem(this.props.provider.account_id, "_accounts");
        this.props.onChangeThreshold(1);
        this.checkRequiredSettings();
    }

    on2FAToggle() {
        if (!this.state.is_secured) {
            this.onAddProvider()
            this.setState({is_secured : true});
        } else {
            this.onRemoveProvider()
            this.setState({is_secured : false});
        }
    }

    render() {
        return (
                <div className="content-area">
                    <table className="table">
                        <tbody>
                            <tr>
                                <td style={{border: "none", width: "80%"}}><Translate content="account.perm.secure_account.secure_enable" />:</td>
                                <td style={{border: "none"}}>
                                    <div className="switch" style={{marginBottom: "10px"}} onClick={this.on2FAToggle.bind(this)}>
                                        <input type="checkbox" checked={this.state.is_secured} onChange={this.on2FAToggle.bind(this)} />
                                        <label />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
    }
}

class PeermitSettings extends React.Component {

    constructor(props) {
        super(props)
        this.provider = PeermitActions.getProvider();
        this.state = {
            successful_steps : {}
        }
    }

    componentDidMount() {
        PeermitActions.loadAccount(this.props.accountName)
        .catch(error => {
            notify.error("" + error);
        });
    }

    stepSuccessful(a) {
        let successful_steps = this.state.successful_steps;
        successful_steps[a] = true;
        this.setState({successful_steps});
    }

    render() {
        if (!this.provider.account_id) {
            return <span>Sorry, this chain is not yet supported by Peermit!</span>;
        }

        let icons = {};
        for (let key of ["registered", "reference", "secured", "published"]) {
            if (this.state.successful_steps[key]) {
                icons[key] = <Icon className={cname("success")} name="checkmark-circle" />
            } else {
                icons[key] = <Icon className={cname("error")} name="cross-circle" />
            }
        }

        let registered = (
                <div style={{paddingBottom: "2rem"}}>
                    <h3>{icons["registered"]} Register</h3>
                    <PeermitSettingsTable
                        {...this.props}
                        onSuccess={this.stepSuccessful.bind(this, "registered")}
                        />
                </div>
        );


        let reference_account = (this.state.successful_steps["registered"]) ? (
                <div style={{paddingBottom: "2rem"}}>
                    <h3>{icons["reference"]} Add reference account</h3>
                    <ReferenceAccount
                        {...this.props}
                        provider={this.provider}
                        onSuccess={this.stepSuccessful.bind(this, "reference")}
                        />
                </div>
        ) : null;

        let enable2FA = (this.state.successful_steps["reference"]) ? (
                <div style={{paddingBottom: "2rem"}}>
                    <h3>{icons["secured"]} Enable Second Factor</h3>
                    <Enable2FAForm
                        {...this.props}
                        onSuccess={this.stepSuccessful.bind(this, "secured")}
                        provider={this.provider}
                        />
                </div>
        ) : null;

        let publish = (this.state.successful_steps["secured"]) ? (
                <div style={{paddingBottom: "2rem"}}>
                    <h3>{icons["published"]} Publish Changes</h3>
                </div>
        ) : null;


        return (
            <div className="no-overflow">
                {registered}
                {reference_account}
                {enable2FA}
                {publish}
            </div>
        )
    }

}
export default PeermitSettings;
