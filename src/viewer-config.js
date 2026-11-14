(() => {
  'use strict';

  const cameras = {front: [.63, .47], side: [1.33, .40], neighbour: [-1.33, .40], rear: [3.42, .36], above: [.55, 1.10]};
  // Approximate views for visual comparison; these are not calibrated camera poses.
  const photoMatches = {
    front: {label:'Front', title:'Front and garden', src:'assets/front.jpg', camera:'front', yaw:.20, pitch:.03, zoom:1.05, focus:[5.8,3.5,.7]},
    frontside: {label:'Front side', title:'Front and courtyard side', src:'assets/Photos Ansal A 60/Iphone Front left.jpeg', camera:'front', yaw:.78, pitch:.03, zoom:1.10, focus:[4.6,3.5,4.8]},
    side: {label:'Side', title:'Courtyard-side elevation', src:'assets/Photos Ansal A 60/Iphone Side.jpeg', camera:'side', yaw:1.50, pitch:.03, zoom:1.20, focus:[2.0,3.1,10.2]},
    courtyard: {label:'Courtyard', title:'Courtyard and glazing', src:'assets/courtyard.jpg', camera:'side', yaw:1.52, pitch:.03, zoom:1.65, focus:[4.5,3.3,8.1]},
    terrace: {label:'First terrace', title:'First-floor terrace, seen from side', src:'assets/Photos Ansal A 60/Iphone Side.jpeg', camera:'side', yaw:1.45, pitch:.03, zoom:1.35, focus:[2.4,4.1,10.2]},
    rear: {label:'Rear', title:'Rear and service yard', src:'assets/Photos Ansal A 60/Iphone Wide Back.jpeg', camera:'rear', yaw:3.13, pitch:.03, zoom:.80, focus:[6.3,4.0,18.5]},
    rearDoors: {label:'Rear doors', title:'Screened bedroom door and kitchen door beside the spiral', src:'assets/Photos Ansal A 60/Iphone Wide Back left.jpeg', camera:'rear', yaw:3.52, pitch:.10, zoom:1.78, focus:[8.8,2.7,17.4]},
    hallLobby: {label:'Hall to lobby', title:'Two openings from the hall to the stair lobby', src:'assets/Photos Ansal A 60/IMG20261026164257.jpg', mode:'interior', floor:'ground', camera:'above', yaw:.10, pitch:1.16, zoom:1.05, focus:[6,.15,6.7]},
    upperLanding: {label:'Puja and landing', title:'Puja recess and railing over the lounge', src:'assets/Photos Ansal A 60/IMG20261103114754.jpg', mode:'interior', floor:'first', camera:'above', yaw:.12, pitch:1.12, zoom:1.26, focus:[6.1,3.42,8.3]},
    spiral: {label:'Spiral stair', title:'Rear spiral stair', src:'assets/rear-stair.jpg', camera:'rear', yaw:3.32, pitch:.03, zoom:1.65, focus:[10.5,2.5,17.8]},
    terracefloor: {label:'Terrace surface', title:'Terrace surface — level to verify', src:'assets/Photos Ansal A 60/IMG-20260226-WA0034.jpg', mode:'interior', floor:'roof', camera:'above', yaw:.55, pitch:1.10, zoom:1.10, focus:[5.7,6.2,10]},
    aerial: {label:'Aerial', title:'Aerial reference — upper light roof', src:'assets/aerial-reference.png', camera:'above', yaw:-1.37, pitch:1.35, zoom:1.10, focus:[5.7,6.1,9.5]}
  };
  window.RAJSEE_VIEWS = {cameras, photoMatches};
})();
