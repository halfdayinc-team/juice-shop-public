function whoCalled() {
    if (arguments.caller == null)   //Noncompliant
       console.log('I was called from the global scope.');
    else
       console.log(arguments.caller + ' called me!');  // Noncompliant
 
   console.log(whoCalled.caller);  // Noncompliant
   console.log(whoCalled.arguments);  // Noncompliant
 }