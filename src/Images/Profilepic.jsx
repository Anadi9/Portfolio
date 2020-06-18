import React from 'react';
import Dp from './Anadi1_dp.jpg';

function Profilepic(props) {
    return (
        <div>
        <img src={Dp} className="rounded" height="380" alt="Profile_pic"></img>
        </div>
    );
}

export default Profilepic;