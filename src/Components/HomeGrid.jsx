import React from 'react';
import Profilepic from '../Images/Profilepic';
import Home from '../Contents/Home';

function HomeGrid(props) {
    return (
        <div className="col s12 m8 l9">
           <div className="row">
             <div className="col-3"><Profilepic/></div>
             <div className=""><Home/></div>
           </div>
        </div>
    );
}

export default HomeGrid;