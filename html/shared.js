
/////////////////////////////////////////////////
/** @type {{ command: string, cb: (data: any) => void }[]} */
let messageHandlers = [];

window.addEventListener('message', data => {
   let recived = data.data;
   messageHandlers.forEach(handler => { 
      if (handler.command == recived.command) { 
         log("Handling message:", recived.command);
         handler.cb(recived.data); 
      } 
   }); 
});