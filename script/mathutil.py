import sys
import math
from eth_abi import encode_single

def log(x, base):
    return math.log(x, base)

def ln(x):
    return math.log(x)

def pow(x, y):
    return math.pow(x, y)    

if __name__ == '__main__':
    fname = sys.argv[1]
    args = sys.argv[3]    
    if fname == 'log2':                       
        n = float(args)            
        result = int(log(n, 2) * 1e18)                        
        print(encode_single('int256', result).hex())        
    elif fname == 'ln':        
        n = float(args)        
        result = int(ln(n) * 1e18)        
        print(encode_single('int256', result).hex())
    elif fname == 'pow':        
        n = float(args.split(',')[0])        
        p = float(args.split(',')[1])                
        result = int(pow(n, p) * 1e18)    
        print(encode_single('int256', result).hex())