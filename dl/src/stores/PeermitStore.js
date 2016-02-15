import alt from "alt-instance"
import PeermitActions from "actions/PeermitActions"

class PeermitStore {

    constructor() {
        this.bindActions(PeermitActions);
        this.submit_message = null;
        this.account_loaded = false;
        this.settings = {};
        this.exportPublicMethods({
            getSettings: this.getSettings.bind(this)
        });
    }

    getSettings() {
        return this.settings;
    }

    onSubmitSettings(message) {
        this.submit_success = message.submit_success;
        this.error = message.error;
    }

    onLoadAccount(data) {
        this.account_loaded = true;
        this.error = data.error;
        if (data.settings) {
            this.settings = data.settings;
        } else {
            this.settings = {};
        }
        this.isMine = data.isMine;
        console.log("Loaded Peermit Account!");
    }

    onSetSetting(v) {
        this.settings[v.key] = v.value;
    }

    onRemoveSetting(key) {
        delete this.settings[key];
    }

    /*
    isAccountLoaded() {
        return this.account_loaded;
    }
   */

}

export default alt.createStore(PeermitStore, 'PeermitStore');
