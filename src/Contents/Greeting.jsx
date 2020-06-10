import React from 'react';
    

function Greeting(props) {
    let currentDate = new Date();
currentDate = currentDate.getHours();
let greeting = '';

if(currentDate>=4 && currentDate<=11){
    greeting = 'Good Morning!';
}else if(currentDate>=12 && currentDate<=16){
    greeting = 'Good Afternoon!';
}else {
    greeting = 'Good Evening!';
}

    return (
            <h2>{ greeting }</h2>
    );
}

export default Greeting;