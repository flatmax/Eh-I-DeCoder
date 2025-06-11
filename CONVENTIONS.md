JRPC-OO lifecycle:
in javascript :
* setupDone() When the system is finished setup and ready to be used
* remoteDisconnected(uuid) Notify that a remote has been disconnected
* remoteIsUp() Remote is up but not ready to call see setupDone
In python (uses asyncio) :
* def remote_is_up(self): Remote is up
* def remote_disconnected(self, uuid): Notify that a remote has been disconnected
* def setup_done(self): When the system is finished setup and ready to be used

Usage :
Both client and server allow you to add an instance of a class and the methods are parsed out enabling it to be called.
py: def add_class(self, cls_instance, obj_name=None):
js: addClass(c, objName) - Typically called in remoteIsUp
Once a class is added the class has :
this.getRemotes to get the remotes in js
self.get_remotes in py
this.getCall to get the call object with the method names available for RPC
self.get_call() (assume get_call exists) in py

JRPC-OO usage :
js promise : this.call['Class.method'](args)
py async : self.get_call()['Class.method'](args)

JRPC-OO response :
The return value is an object of {remote UUID : return data, ... }. utils.js function extractResponseData returns the data from the first UUID, as well as data for other forms.

webapp js :
customElements.define are separated from their classes - customElements.define calls are put in the `webapp` directory and the class implementation in the `webapp/src` directory or its sub-directories as required.