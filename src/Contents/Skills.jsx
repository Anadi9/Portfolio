import React from 'react';
import { ReactIcon, HtmlIcon, BootstrapIcon, JsIcon, CssIcon, HerokuIcon, NodejsIcon, MongodbIcon } from './Icons';

function Skills(props) {
    return (
        <div>
         <h1 className="text-success">Skills</h1>
         <table className="table text-muted">
           <tbody>
            <tr>
              <td>
                <ul className="no-bullets">
                  <li><ReactIcon/>React Js</li>
                  <li><BootstrapIcon/>Bootstrap</li>
                  <li><HtmlIcon/>HTML</li>
                  <li><JsIcon/>JavaScript</li>
                </ul>
              </td>
              <td>
                <ul className="no-bullets">
                  <li><CssIcon/>CSS</li>
                  <li><HerokuIcon/>Heroku</li>
                  <li><NodejsIcon/> Node.js</li>
                  <li><MongodbIcon/>Mongodb</li>
                </ul>
              </td>
            </tr>
         </tbody>
        </table>
     </div>
  );
}

export default Skills;