import React from 'react';

function Skills(props) {
    return (
        <div>
         <h1 className="text-success">Skills</h1>
         <table className="table">
            <tr className="text-white">
              <td><ul>
                <li>React Js</li>
                <li>Bootstrap</li>
                <li>HTML</li>
                <li>JavaScript</li>
              </ul></td>
            
              <td><ul>
                <li>CSS</li>
                <li>Heroku</li>
                <li>Node.js</li>
                <li>Mongodb</li>
              </ul></td>
            </tr>
         
         </table>
            
        </div>
    );
}

export default Skills;