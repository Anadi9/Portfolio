import React from 'react';
import { ReactIcon, HtmlIcon, BootstrapIcon, JsIcon, CssIcon, HerokuIcon, NodejsIcon, MongodbIcon } from './Icons';
import Bounce from 'react-reveal/Bounce';

function Skills(props) {
    return (
        <div className="container-fluid my-5 py-5"><Bounce bottom>
         <h1 className="text-center" style={{ "color": "#E91E63" }}>Skills</h1></Bounce>
         <div className="row text-white">
        <div className="col-10 mx-auto">
        <div className="row">
               <div className="col-md-4 mx-auto pt-5 order-1 order-lg-1">
               <div className="text-center">
                <span><Bounce left>
                  <ReactIcon/>React Js<br/>
                  <BootstrapIcon/>Bootstrap<br/>
                  <HtmlIcon/>HTML<br/>
                  <JsIcon/>JavaScript<br/></Bounce>
                </span>
                </div>
                </div>
                <div className="col-md-4 mx-auto pt-5 order-2 order-lg-2">
                <div className="text-center">
                <span><Bounce right>
                  <CssIcon/>CSS<br/>
                  <HerokuIcon/>Heroku<br/>
                  <NodejsIcon/> Node.js<br/>
                  <MongodbIcon/>Mongodb<br/></Bounce>
                </span>
                </div>
                </div>
        </div>
        </div>
        </div>
        </div>
  );
}

export default Skills;