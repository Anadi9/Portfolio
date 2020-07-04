import React from 'react';
import Dp from '../Images/Anadi1_dp.png';
import Contact from './Contact';


function LandingPage(props) {
    return (
        <div className="container-fluid">
        <div className="row">
        <div className="col-12 mx-auto">
         <div className="row">
         <div className="col-md-4 pl-5 order-1 order-lg-2">
            <div className="front">
               <img 
               src={Dp} 
               height="520px" 
               style={{"boxShadow":"5px 5px 5px #06D85F"}}
               alt="Profile_pic">
               </img>
            </div>
         </div>
         <div className="col-md-8 mt-5 pl-4 order-2 order-lg-1">
         <div>
         <h1 style={{ "fontFamily": "Alex Brush, cursive","color": "white", "wordSpacing": "5px", "letterSpacing": "4px"}}>I am <strong 
         style={{ "color": "#06D85F",}}>Anadi Thakur</strong></h1>
            <h3 className="pt-3" 
            style={{"color": "black", "textShadow": "3px 1px 0px #E91E63", "wordSpacing": "5px"}}>
            | DEVELOPER | DESIGNER | PROGRAMMER | FREELANCER |
            </h3>
         <p className="h5 pt-5 text-white">
            I am here to <code>&lt;code&gt;</code> ideas and bring them to life.
         </p>
         <p className="text-white">I Hate sleeping so I am here to provide my services to my clients.<br/>
            It's boredom to not have tension that's why I keep myself engaged in coding and developing UI/UX. </p>
            <div className="my-5 pt-5">
            <Contact/>
            </div>
         </div>
         </div>
         </div>
        </div>
        </div>
        </div>
    );
}

export default LandingPage;