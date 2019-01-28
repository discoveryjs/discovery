/* eslint-env browser */

export default function(discovery) {
    function updatePagePropsFromHash() {
        discovery.setPageHash(location.hash);
    }

    const superSetPageHash = discovery.setPageHash;
    discovery.setPageHash = function(hash, replace) {
        if (superSetPageHash.call(this, hash, replace)) {
            if (replace) {
                location.replace(this.pageHash);
            } else {
                location.hash = this.pageHash;
            }

            return true;
        }
    };

    updatePagePropsFromHash();
    discovery.cancelScheduledRender();
    window.addEventListener('hashchange', updatePagePropsFromHash, false);
}
