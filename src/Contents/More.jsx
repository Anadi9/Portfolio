import React from 'react';
import ReviewBox from './ReviewBox';
import Contact from './Contact';



function More(props) {
    return (
        <div className="col s12 m8 l9">
            <h1 className="text-success">More</h1><br/>
            <ReviewBox/><br/>
            <div className="">
            </div>
            <Contact/>
        </div>
    );
}

export default More;