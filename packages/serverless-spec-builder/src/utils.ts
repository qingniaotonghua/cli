import { existsSync, readFileSync } from 'fs';

export interface Ilayer {
  [extName: string]: {
    path: string;
  };
}
export function formatLayers(...multiLayers: Ilayer[]) {
  const layerTypeList: any = {};
  multiLayers.forEach((layer: Ilayer) => {
    Object.keys(layer || {}).forEach(layerName => {
      if (!layer[layerName].path) {
        return;
      }
      const [type, path] = layer[layerName].path.split(':');
      if (!layerTypeList[type]) {
        layerTypeList[type] = {};
      }
      layerTypeList[type][layerName] = path;
    });
  });
  return layerTypeList;
}

export function getLayers(...layersList: any) {
  const layerTypeList = formatLayers(...layersList);
  const layerDeps = [];
  const layers = [];

  if (layerTypeList) {
    for (const type in layerTypeList) {
      const typeLayerMap = layerTypeList[type];
      if (!typeLayerMap) {
        continue;
      }
      for (const layerName in typeLayerMap) {
        const name = `layer_${type}_${layerName.replace(/[^\w]/g, '_')}`;
        layerDeps.push({
          name,
          type,
          path: typeLayerMap[layerName].replace(/@[^/]*$/, ''), // 移除末尾版本
        });
        layers.push(name);
      }
    }
  }
  return {
    layerDeps,
    layers,
  };
}

export function uppercaseObjectKey(obj) {
  if (obj) {
    const json = JSON.stringify(obj);
    const result = json.replace(/"([^"])([^"]*)":/gim, (...value) => {
      return `"${value[1].toUpperCase()}${value[2]}":`;
    });
    return JSON.parse(result);
  }
}

export function lowercaseObjectKey(obj) {
  if (obj) {
    const json = JSON.stringify(obj);
    const result = json.replace(/"([^"])([^"]*)":/gim, (...value) => {
      return `"${value[1].toLowerCase()}${value[2]}":`;
    });
    return JSON.parse(result);
  }
}

export function removeObjectEmptyAttributes(obj) {
  function isObjectEmpty(el) {
    return el !== null && el !== undefined && el !== '';
  }

  function removeEmptyArray(arr) {
    const newArr = [];

    for (const ele of arr) {
      if (ele && typeof ele === 'object') {
        const el = removeObjectEmptyAttributes(ele);
        if (isObjectEmpty(el)) {
          newArr.push(el);
        }
      } else if (isObjectEmpty(ele)) {
        newArr.push(ele);
      }
    }
    if (newArr.length) {
      return newArr;
    }
  }

  function removeEmptyObject(obj) {
    const newObj = {};
    Object.keys(obj).forEach(key => {
      if (obj[key] && typeof obj[key] === 'object') {
        if (Array.isArray(obj[key])) {
          const arr = removeEmptyArray(obj[key]);
          if (arr) {
            newObj[key] = arr;
          }
        } else {
          const ele = removeEmptyObject(obj[key]); // recurse
          if (ele) {
            newObj[key] = ele;
          }
        }
      } else if (isObjectEmpty(obj[key])) {
        newObj[key] = obj[key]; // copy value
      }
    });
    if (Object.keys(newObj).length > 0) {
      return newObj;
    }
  }

  return removeEmptyObject(obj);
}

/**
 * USER_DEFINED_ENVIRONMENT_VARIABLE
 */
const USER_DEFINIED_ENV_KEY = 'UDEV_';

export function filterUserDefinedEnv() {
  const userDefinedEnv = {};
  for (const key in process.env || {}) {
    if (key.startsWith(USER_DEFINIED_ENV_KEY)) {
      userDefinedEnv[key.replace(USER_DEFINIED_ENV_KEY, '')] = process.env[key];
    }
  }
  return userDefinedEnv;
}

export const getFaaSPackageVersion = (distDir, baseDir) => {
  let faasPkgFile;
  const cwd = process.cwd();
  try {
    const modName: any = '@midwayjs/faas';
    faasPkgFile = require.resolve(modName + '/package.json', {
      paths: [distDir, baseDir],
    });
  } catch {
    //
  }
  process.chdir(cwd);

  let faasVersion = 1;
  if (faasPkgFile && existsSync(faasPkgFile)) {
    const { version } = JSON.parse(readFileSync(faasPkgFile).toString());
    if (version[0]) {
      faasVersion = +version[0];
    }
  }
  return faasVersion;
};
